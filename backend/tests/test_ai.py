from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.nutrition import FoodRecord, Macros
from app.services import auth
from app.services.context_builder import IST, UserContext, next_meal_slot
from app.services.nutrition_engine import NutritionEngine, get_engine
from app.services.recommender import Profile, allowed_for, compute_targets, recommend

client = TestClient(app)


def _food(name: str, category: str, kcal: float, protein: float, grams: float, fiber: float = 1) -> FoodRecord:
    return FoodRecord(
        name=name,
        category=category,
        default_grams=grams,
        default_serving_unit="katori",
        per_100g=Macros(calories=kcal, protein=protein, carbs=15, fat=4, fiber=fiber),
    )


@pytest.fixture
def engine() -> NutritionEngine:
    e = NutritionEngine()
    e.load(
        [
            _food("Rajma (Kidney Beans)", "dal", 130, 8.5, 150, fiber=5),
            _food("Paneer Bhurji", "vegetable", 200, 14, 120),
            _food("Chicken Curry", "non_veg", 150, 18, 150),
            _food("Egg Curry", "non_veg", 155, 12, 80),
            _food("Jeera Rice", "grain", 150, 2.7, 180),
            _food("Gulab Jamun", "sweet", 325, 5, 40),
            _food("Puri", "grain", 350, 7, 30),
        ]
    )
    return e


MENU = ["Rajma", "Paneer Bhurji", "Chicken Curry", "Egg Curry", "Jeera Rice", "Gulab Jamun", "Puri"]


# ---------- targets ----------

def test_targets_default_without_body_stats() -> None:
    assert compute_targets(Profile()).calories == 2200


def test_targets_personalised() -> None:
    t = compute_targets(Profile(age=20, height_cm=175, weight_kg=70, activity_level="active", goal="gain_muscle"))
    # BMR = 700 + 1093.75 - 100 - 78 = 1615.75; *1.725 + 300 = 3087 -> 3090
    assert t.calories == 3090
    assert t.protein == 112  # 70 * 1.6


# ---------- diet & allergy filtering ----------

@pytest.mark.parametrize(
    "name,category,pref,allergies,expected",
    [
        ("Chicken Curry", "non_veg", "veg", None, False),
        ("Egg Curry", "non_veg", "veg", None, False),
        ("Egg Curry", "non_veg", "egg", None, True),
        ("Chicken Curry", "non_veg", "egg", None, False),
        ("Chicken Curry", "non_veg", "non_veg", None, True),
        ("Paneer Bhurji", "vegetable", "veg", ["dairy"], False),
        ("Puri", "grain", None, ["Gluten"], False),
        ("Jeera Rice", "grain", None, ["gluten"], True),
        ("Rajma (Kidney Beans)", "dal", None, ["kidney beans"], False),
    ],
)
def test_allowed_for(name, category, pref, allergies, expected) -> None:
    profile = Profile(diet_preference=pref, allergies=allergies)
    assert allowed_for(name, category, profile) is expected


# ---------- recommendations ----------

def test_muscle_gain_vegetarian_picks_protein(engine: NutritionEngine) -> None:
    picks = recommend(
        MENU, meal="dinner", engine=engine,
        profile=Profile(goal="gain_muscle", diet_preference="veg"), eaten_today=Macros(),
    )
    names = [p.food_name for p in picks if p.kind == "recommended"]
    assert names[0] == "Paneer Bhurji"
    assert "Chicken Curry" not in names and "Egg Curry" not in names
    assert all(p.kind == "recommended" for p in picks)  # nothing flagged when bulking


def test_weight_loss_flags_energy_dense_foods(engine: NutritionEngine) -> None:
    picks = recommend(
        MENU, meal="dinner", engine=engine,
        profile=Profile(goal="lose_weight", diet_preference="non_veg"), eaten_today=Macros(),
    )
    limits = {p.food_name for p in picks if p.kind == "limit"}
    recommended = [p.food_name for p in picks if p.kind == "recommended"]
    assert limits == {"Gulab Jamun", "Puri"}
    assert "Chicken Curry" in recommended
    assert len(recommended) == 3


def test_recommend_handles_empty_menu(engine: NutritionEngine) -> None:
    assert recommend([], meal="lunch", engine=engine, profile=Profile(), eaten_today=Macros()) == []


# ---------- context ----------

@pytest.mark.parametrize(
    "hhmm,expected_meal,tomorrow",
    [("06:00", "breakfast", False), ("08:00", "breakfast", False), ("10:00", "lunch", False),
     ("15:00", "snacks", False), ("19:00", "dinner", False), ("22:30", "breakfast", True)],
)
def test_next_meal_slot(hhmm: str, expected_meal: str, tomorrow: bool) -> None:
    h, m = map(int, hhmm.split(":"))
    now = datetime(2026, 11, 4, h, m, tzinfo=IST)
    meal, day = next_meal_slot(now)
    assert meal == expected_meal
    assert (day > now.date()) is tomorrow


def _context(**overrides) -> UserContext:
    base = dict(
        name="Asha", bhawan="Rajiv Bhawan", profile=Profile(diet_preference="veg"),
        now=datetime(2026, 11, 4, 18, 0, tzinfo=IST),
        targets=Macros(calories=2200, protein=85), eaten_today=Macros(calories=900, protein=30),
        menu={"wednesday": {"dinner": ["Rajma", "Rice"]}}, menu_week_start="2026-11-02",
        next_meal="dinner", next_meal_day="today",
    )
    return UserContext(**{**base, **overrides})


def test_context_prompt_mentions_menu_and_intake() -> None:
    text = _context().to_prompt()
    assert "Rajiv Bhawan" in text
    assert "wednesday: dinner: Rajma, Rice" in text
    assert "Eaten today: 900 kcal, 30g protein" in text
    assert "nothing logged yet" in text
    assert "Next meal: today dinner" in text


def test_context_prompt_without_menu() -> None:
    assert "Mess menu: not published yet" in _context(menu={}).to_prompt()


# ---------- /api/chat ----------

class FakeDb:
    def __init__(self) -> None:
        self.inserted: list[tuple[str, object]] = []

    async def select(self, table: str, params: dict) -> list[dict]:
        if table == "ai_chat_sessions":
            return [{"id": "s1"}] if params["id"] == "eq.s1" else []
        if table == "ai_chat_messages":
            return [{"role": "assistant", "content": "Hi!"}, {"role": "user", "content": "Hello"}]
        return []

    async def insert(self, table: str, rows) -> list[dict]:
        self.inserted.append((table, rows))
        return [{"id": "new-session"}]


@pytest.fixture
def fake_db(monkeypatch) -> FakeDb:
    db = FakeDb()
    user = auth.CurrentUser(id="u1", role="student", bhawan_id="b1", token="t")
    monkeypatch.setattr(auth.CurrentUser, "db", lambda self: db)
    app.dependency_overrides[auth.get_current_user] = lambda: user
    app.dependency_overrides[get_engine] = lambda: NutritionEngine()

    async def fake_context(db, user_id, engine, now=None):
        return _context()

    monkeypatch.setattr("app.api.chat_ai.build_context", fake_context)
    yield db
    app.dependency_overrides.clear()


def test_chat_new_session_stores_both_messages(fake_db: FakeDb, monkeypatch) -> None:
    captured = {}

    async def fake_generate(*, system: str, history, message: str) -> str:
        captured.update(system=system, history=history, message=message)
        return "Have the rajma with two rotis."

    monkeypatch.setattr("app.api.chat_ai.generate_chat", fake_generate)
    res = client.post("/api/chat", json={"message": "What should I eat for dinner?"})

    assert res.status_code == 200
    assert res.json()["session_id"] == "new-session"
    assert res.json()["reply"] == "Have the rajma with two rotis."
    assert "Rajma" in captured["system"] and captured["history"] == []
    stored = [(t, r["role"]) for t, r in fake_db.inserted if t == "ai_chat_messages"]
    assert stored == [("ai_chat_messages", "user"), ("ai_chat_messages", "assistant")]


def test_chat_existing_session_passes_history_in_order(fake_db: FakeDb, monkeypatch) -> None:
    captured = {}

    async def fake_generate(*, system, history, message):
        captured["history"] = history
        return "ok"

    monkeypatch.setattr("app.api.chat_ai.generate_chat", fake_generate)
    res = client.post("/api/chat", json={"message": "and protein?", "session_id": "s1"})
    assert res.status_code == 200
    assert captured["history"] == [("user", "Hello"), ("assistant", "Hi!")]


def test_chat_unknown_session_404(fake_db: FakeDb) -> None:
    res = client.post("/api/chat", json={"message": "hi", "session_id": "nope"})
    assert res.status_code == 404


def test_recommendations_endpoint(fake_db: FakeDb) -> None:
    res = client.get("/api/chat/recommendations")
    assert res.status_code == 200
    assert res.json()["meal"] == "dinner" and res.json()["menu_available"] is True


# ---------- rate limiting ----------

def test_sliding_window_limiter_blocks_then_recovers(monkeypatch) -> None:
    from fastapi import HTTPException

    from app.services import rate_limit

    clock = [1000.0]
    monkeypatch.setattr(rate_limit.time, "monotonic", lambda: clock[0])
    limiter = rate_limit.SlidingWindowLimiter(limit=2, window_seconds=60)

    limiter.check("u1")
    limiter.check("u1")
    limiter.check("u2")  # separate quota per user
    with pytest.raises(HTTPException) as exc:
        limiter.check("u1")
    assert exc.value.status_code == 429
    assert exc.value.headers["Retry-After"] == "61"

    clock[0] += 61
    limiter.check("u1")  # window has passed


# ---------- Gemini errors ----------

def test_region_block_gives_actionable_error(monkeypatch) -> None:
    import asyncio

    from google.genai import errors, types

    from app.services import gemini_client

    class FakeModels:
        async def generate_content(self, **kwargs):
            raise errors.ClientError(
                400,
                {"error": {"code": 400, "message": "User location is not supported for the API use.",
                           "status": "FAILED_PRECONDITION"}},
            )

    class FakeClient:
        class aio:
            models = FakeModels()

    monkeypatch.setattr(gemini_client, "get_client", lambda: FakeClient())
    with pytest.raises(gemini_client.GeminiRequestError, match="region"):
        asyncio.run(gemini_client._generate([], types.GenerateContentConfig(), max_attempts=1))
