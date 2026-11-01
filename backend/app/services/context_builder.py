"""Gathers what the AI assistant needs to know about a user, read with the
user's own JWT (RLS applies): profile, this week's menu, and recent meals."""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field

from app.models.nutrition import Macros
from app.services.recommender import Profile, Suggestion, compute_targets, recommend
from app.services.nutrition_engine import NutritionEngine
from app.services.supabase_rest import SupabaseRest

IST = ZoneInfo("Asia/Kolkata")
DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
MEALS = ["breakfast", "lunch", "snacks", "dinner"]
# Serving windows in minutes since midnight (matches the frontend MEAL_SCHEDULE)
MEAL_WINDOWS = {
    "breakfast": (7 * 60 + 30, 9 * 60 + 30),
    "lunch": (12 * 60 + 15, 14 * 60 + 15),
    "snacks": (16 * 60 + 30, 18 * 60),
    "dinner": (19 * 60 + 30, 21 * 60 + 30),
}


class UserContext(BaseModel):
    name: str
    bhawan: str | None
    profile: Profile
    now: datetime
    targets: Macros
    eaten_today: Macros
    meals_today: list[str] = Field(default_factory=list)
    week_avg_calories: float | None = None
    days_logged: int = 0
    menu: dict[str, dict[str, list[str]]] = Field(default_factory=dict)
    menu_week_start: str | None = None
    next_meal: str
    next_meal_day: str
    suggestions: list[Suggestion] = Field(default_factory=list)

    def to_prompt(self) -> str:
        p = self.profile
        lines = [
            f"Student: {self.name}" + (f", {self.bhawan}" if self.bhawan else ""),
            f"Now: {self.now:%A %d %b, %H:%M} IST",
            "Profile: "
            + ", ".join(
                part
                for part in [
                    f"age {p.age}" if p.age else None,
                    f"{p.height_cm:g} cm" if p.height_cm else None,
                    f"{p.weight_kg:g} kg" if p.weight_kg else None,
                    f"activity {p.activity_level}" if p.activity_level else None,
                    f"goal {p.goal}" if p.goal else None,
                    f"diet {p.diet_preference}" if p.diet_preference else None,
                    f"allergies {', '.join(p.allergies)}" if p.allergies else None,
                ]
                if part
            )
            or "Profile: not filled in (targets are defaults)",
            f"Daily targets: {self.targets.calories:.0f} kcal, {self.targets.protein:.0f}g protein, "
            f"{self.targets.carbs:.0f}g carbs, {self.targets.fat:.0f}g fat",
            f"Eaten today: {self.eaten_today.calories:.0f} kcal, {self.eaten_today.protein:.0f}g protein, "
            f"{self.eaten_today.carbs:.0f}g carbs, {self.eaten_today.fat:.0f}g fat",
        ]
        lines += [f"  - {m}" for m in self.meals_today] or ["  - nothing logged yet"]
        if self.week_avg_calories is not None:
            lines.append(
                f"Last 7 days: {self.days_logged} days logged, "
                f"average {self.week_avg_calories:.0f} kcal on logged days"
            )

        if self.menu:
            lines.append(f"Mess menu (week of {self.menu_week_start}):")
            for day in DAYS:
                if day not in self.menu:
                    continue
                meals = "; ".join(
                    f"{meal}: {', '.join(items)}"
                    for meal in MEALS
                    if (items := self.menu[day].get(meal))
                )
                lines.append(f"  {day}: {meals}")
        else:
            lines.append("Mess menu: not published yet")

        lines.append(f"Next meal: {self.next_meal_day} {self.next_meal}")
        if self.suggestions:
            lines.append("Rule-based picks for the next meal:")
            lines += [
                f"  - [{s.kind}] {s.food_name} ({s.grams:g} g, {s.nutrients.calories:.0f} kcal, "
                f"{s.nutrients.protein:.0f}g protein): {s.reason}"
                for s in self.suggestions
            ]
        return "\n".join(lines)


def next_meal_slot(now: datetime) -> tuple[str, date]:
    """The meal being served now, else the next one (rolling to tomorrow)."""
    minutes = now.hour * 60 + now.minute
    for meal in MEALS:
        if minutes <= MEAL_WINDOWS[meal][1]:
            return meal, now.date()
    return "breakfast", now.date() + timedelta(days=1)


def _sum_logs(logs: list[dict]) -> Macros:
    total = Macros()
    for log in logs:
        total = total + Macros(
            calories=log.get("total_calories") or 0,
            protein=log.get("total_protein") or 0,
            carbs=log.get("total_carbs") or 0,
            fat=log.get("total_fat") or 0,
            fiber=log.get("total_fiber") or 0,
        )
    return total


async def build_context(
    db: SupabaseRest,
    user_id: str,
    engine: NutritionEngine,
    now: datetime | None = None,
) -> UserContext:
    now = now or datetime.now(IST)
    today = now.date()
    monday = today - timedelta(days=today.weekday())

    profiles = await db.select(
        "profiles",
        {
            "id": f"eq.{user_id}",
            "select": "full_name,bhawan_id,age,height_cm,weight_kg,activity_level,goal,"
            "diet_preference,allergies,bhawans(name)",
        },
    )
    row = profiles[0] if profiles else {}
    profile = Profile.model_validate(row)

    menu: dict[str, dict[str, list[str]]] = {}
    menu_week_start = None
    if row.get("bhawan_id"):
        menus = await db.select(
            "menus",
            {
                "bhawan_id": f"eq.{row['bhawan_id']}",
                "status": "eq.published",
                "week_start": f"lte.{monday.isoformat()}",
                "order": "week_start.desc",
                "limit": "1",
                "select": "id,week_start",
            },
        )
        if menus:
            menu_week_start = menus[0]["week_start"]
            items = await db.select(
                "menu_items",
                {"menu_id": f"eq.{menus[0]['id']}", "select": "day,meal,item_name,item_order",
                 "order": "item_order.asc"},
            )
            for item in items:
                menu.setdefault(item["day"], {}).setdefault(item["meal"], []).append(item["item_name"])

    logs = await db.select(
        "meal_logs",
        {
            "user_id": f"eq.{user_id}",
            "meal_date": f"gte.{(today - timedelta(days=6)).isoformat()}",
            "select": "meal_date,meal_type,total_calories,total_protein,total_carbs,total_fat,"
            "total_fiber,meal_log_items(food_name,estimated_grams)",
            "order": "created_at.asc",
        },
    )
    todays = [log for log in logs if log["meal_date"] == today.isoformat()]
    days_logged = len({log["meal_date"] for log in logs})

    meal, meal_date = next_meal_slot(now)
    meal_day = DAYS[meal_date.weekday()]
    eaten_today = _sum_logs(todays) if meal_date == today else Macros()
    # After Sunday dinner this reads the current menu's Monday, which is the
    # best guess until next week's menu is published (menus mostly repeat).
    next_items = menu.get(meal_day, {}).get(meal, [])

    return UserContext(
        name=(row.get("full_name") or "Student").split(" ")[0],
        bhawan=(row.get("bhawans") or {}).get("name"),
        profile=profile,
        now=now,
        targets=compute_targets(profile),
        eaten_today=_sum_logs(todays),
        meals_today=[
            f"{log['meal_type']}: {log.get('total_calories') or 0:.0f} kcal "
            f"({', '.join(i['food_name'] for i in log.get('meal_log_items') or []) or 'no items'})"
            for log in todays
        ],
        week_avg_calories=(_sum_logs(logs).calories / days_logged) if days_logged else None,
        days_logged=days_logged,
        menu=menu,
        menu_week_start=menu_week_start,
        next_meal=meal,
        next_meal_day="today" if meal_date == today else "tomorrow",
        suggestions=recommend(
            next_items, meal=meal, engine=engine, profile=profile, eaten_today=eaten_today
        ),
    )
