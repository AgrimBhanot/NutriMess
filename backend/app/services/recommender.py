"""Rules-based meal recommendations: goal + diet + what the mess is serving."""

from typing import Literal

from pydantic import BaseModel

from app.models.nutrition import Macros
from app.services.nutrition_engine import NutritionEngine

ACTIVITY_FACTORS = {"sedentary": 1.2, "moderate": 1.55, "active": 1.725, "very_active": 1.9}

# Typical active college student, used until the profile is filled in
DEFAULT_TARGETS = Macros(calories=2200, protein=85, carbs=290, fat=65, fiber=30)

# Share of the day's calories each meal usually covers
MEAL_SHARE = {"breakfast": 0.25, "lunch": 0.35, "snacks": 0.1, "dinner": 0.3}

# Dish keywords for common allergy / intolerance labels
ALLERGEN_KEYWORDS: dict[str, list[str]] = {
    "dairy": ["paneer", "curd", "dahi", "milk", "raita", "kheer", "lassi", "buttermilk",
              "chaas", "custard", "ice cream", "butter", "malai", "makhani", "kulfi"],
    "lactose": ["paneer", "curd", "dahi", "milk", "raita", "kheer", "lassi", "buttermilk",
                "chaas", "custard", "ice cream", "makhani", "kulfi"],
    "gluten": ["roti", "chapati", "naan", "paratha", "puri", "bread", "pasta", "bhature",
               "samosa", "chowmein", "noodles", "upma", "halwa", "kulcha"],
    "wheat": ["roti", "chapati", "naan", "paratha", "puri", "bread", "pasta", "bhature"],
    "egg": ["egg", "omelette", "anda"],
    "peanut": ["peanut", "groundnut", "poha"],
    "soy": ["soya", "soy", "nutrela"],
    "fish": ["fish"],
}


class Profile(BaseModel):
    age: int | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    activity_level: str | None = None
    goal: str | None = None
    diet_preference: str | None = None
    allergies: list[str] | None = None


class Suggestion(BaseModel):
    food_name: str
    grams: float
    serving_unit: str | None
    nutrients: Macros
    reason: str
    kind: Literal["recommended", "limit"]


def compute_targets(profile: Profile) -> Macros:
    """Mifflin-St Jeor with a sex-neutral constant (mirrors the frontend)."""
    if not (profile.age and profile.height_cm and profile.weight_kg):
        return DEFAULT_TARGETS
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 78
    calories = bmr * ACTIVITY_FACTORS.get(profile.activity_level or "", 1.55)
    if profile.goal == "lose_weight":
        calories -= 400
    elif profile.goal == "gain_muscle":
        calories += 300
    calories = round(calories / 10) * 10
    protein = round(profile.weight_kg * (1.6 if profile.goal == "gain_muscle" else 1.0))
    fat = round(calories * 0.27 / 9)
    carbs = max(0, round((calories - protein * 4 - fat * 9) / 4))
    return Macros(calories=calories, protein=protein, carbs=carbs, fat=fat, fiber=30)


def _is_egg(name: str) -> bool:
    n = name.lower()
    return "egg" in n or "omelette" in n or "anda" in n


def allowed_for(name: str, category: str | None, profile: Profile) -> bool:
    lowered = name.lower()
    pref = profile.diet_preference
    if pref in ("veg", "egg"):
        if category == "non_veg" and not (pref == "egg" and _is_egg(name)):
            return False
        if pref == "veg" and _is_egg(name):
            return False
    for allergy in profile.allergies or []:
        key = allergy.strip().lower()
        if not key:
            continue
        keywords = ALLERGEN_KEYWORDS.get(key, [key])
        if any(k in lowered for k in keywords):
            return False
    return True


def recommend(
    menu_items: list[str],
    *,
    meal: str,
    engine: NutritionEngine,
    profile: Profile,
    eaten_today: Macros,
    max_recommended: int = 3,
    max_limit: int = 2,
) -> list[Suggestion]:
    """Pick the best dishes on the menu for this user's goal and what's left
    of today's budget, plus a couple to go easy on."""
    targets = compute_targets(profile)
    remaining_kcal = max(0.0, targets.calories - eaten_today.calories)
    remaining_protein = max(0.0, targets.protein - eaten_today.protein)
    meal_budget = max(targets.calories * MEAL_SHARE.get(meal, 0.3), min(remaining_kcal, 900))
    goal = profile.goal or "balanced"

    scored: list[tuple[float, Suggestion]] = []
    limits: list[tuple[float, Suggestion]] = []
    seen: set[str] = set()

    for item in menu_items:
        food, _ = engine.match(item)
        if food is None or food.name in seen:
            continue
        seen.add(food.name)
        if not allowed_for(food.name, food.category, profile):
            continue

        n = food.per_100g.scaled(food.default_grams)
        if n.calories <= 0:
            continue
        protein_density = n.protein * 4 / n.calories  # share of kcal from protein
        energy_dense = food.per_100g.calories >= 300 or food.category == "sweet"

        if goal == "gain_muscle":
            score = n.protein + 20 * protein_density
            reason = f"{n.protein:.0f}g protein per {food.default_serving_unit or 'serving'}"
        elif goal == "lose_weight":
            score = 30 * protein_density + n.fiber - n.calories / 60
            reason = f"Filling for {n.calories:.0f} kcal"
        else:
            score = 15 * protein_density + n.fiber / 2 - abs(n.calories - meal_budget / 3) / 100
            reason = "Good balance of protein and carbs"
        if remaining_protein > 25 and n.protein >= 7:
            score += 3
            reason = f"Helps with the {remaining_protein:.0f}g protein you still need today"

        suggestion = Suggestion(
            food_name=food.name,
            grams=food.default_grams,
            serving_unit=food.default_serving_unit,
            nutrients=n,
            reason=reason,
            kind="recommended",
        )
        if energy_dense and goal != "gain_muscle":
            limits.append((
                food.per_100g.calories,
                suggestion.model_copy(update={
                    "kind": "limit",
                    "reason": f"{n.calories:.0f} kcal per {food.default_serving_unit or 'serving'}; keep it to one",
                }),
            ))
        else:
            scored.append((score, suggestion))

    scored.sort(key=lambda s: -s[0])
    limits.sort(key=lambda s: -s[0])
    return [s for _, s in scored[:max_recommended]] + [s for _, s in limits[:max_limit]]
