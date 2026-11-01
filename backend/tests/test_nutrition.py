import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.nutrition import CalculateItem, FoodRecord, Macros, Portion
from app.models.plate import GeminiDetectedFood, GeminiPlateResult, PlateAnalysis
from app.services import auth
from app.services.nutrition_engine import NutritionEngine, get_engine
from app.services.plate_analyzer import build_analysis

client = TestClient(app)


def _food(name: str, kcal: float, protein: float, grams: float, aliases=None, id=None) -> FoodRecord:
    return FoodRecord(
        id=id,
        name=name,
        default_grams=grams,
        default_serving_unit="katori",
        per_100g=Macros(calories=kcal, protein=protein, carbs=10, fat=2, fiber=1),
        source="IFCT2017",
        aliases=aliases or [],
    )


@pytest.fixture
def engine() -> NutritionEngine:
    e = NutritionEngine()
    e.load(
        [
            _food("Chapati / Roti", 240, 7.5, 40, id="roti-id"),
            _food("Rajma (Kidney Beans)", 130, 8.5, 150, id="rajma-id"),
            _food("Arhar / Toor Dal", 110, 7, 150, id="dal-id"),
            _food("Dal Makhani", 140, 6, 150, aliases=["maa ki dal"]),
            _food("Plain Rice (Steamed)", 130, 2.7, 180, id="rice-id"),
        ]
    )
    return e


# ---------- matching ----------

@pytest.mark.parametrize(
    "query,expected",
    [
        ("Roti", "Chapati / Roti"),
        ("chapati", "Chapati / Roti"),
        ("RAJMA", "Rajma (Kidney Beans)"),
        ("kidney beans", "Rajma (Kidney Beans)"),
        ("Toor dal", "Arhar / Toor Dal"),
        ("maa ki dal", "Dal Makhani"),
        ("steamed rice", "Plain Rice (Steamed)"),
    ],
)
def test_match_aliases(engine: NutritionEngine, query: str, expected: str) -> None:
    food, score = engine.match(query)
    assert food is not None and food.name == expected
    assert score >= 0.78


def test_unknown_food_does_not_match(engine: NutritionEngine) -> None:
    food, _ = engine.match("Pizza Margherita")
    assert food is None


# ---------- calculation ----------

def test_calculate_uses_portions_and_grams(engine: NutritionEngine) -> None:
    result = engine.calculate(
        [
            CalculateItem(food_name="roti", grams=80),
            CalculateItem(food_name="rajma", portion=Portion.large),
            CalculateItem(food_name="unknown thing"),
        ]
    )
    roti, rajma = result.items
    assert roti.food_id == "roti-id" and roti.grams == 80
    assert roti.nutrients.calories == 192  # 240 * 0.8
    assert rajma.grams == 225  # 150 * 1.5
    assert rajma.nutrients.protein == pytest.approx(19.1, abs=0.1)
    assert result.totals.calories == pytest.approx(192 + 292.5, abs=0.2)


# ---------- plate analysis ----------

def _detected(name: str, matched: str | None, grams: float, conf: float = 0.9) -> GeminiDetectedFood:
    return GeminiDetectedFood(
        name=name,
        matched_name=matched,
        estimated_grams=grams,
        confidence=conf,
        calories_per_100g=200,
        protein_per_100g=5,
        carbs_per_100g=30,
        fat_per_100g=7,
        fiber_per_100g=2,
    )


def test_build_analysis_matches_and_falls_back(engine: NutritionEngine) -> None:
    result = GeminiPlateResult(
        is_food=True,
        items=[
            _detected("Phulka", "Chapati / Roti", 120),
            _detected("Rajma Masala", None, 150),
            _detected("Veg Momos", None, 5000, conf=0.6),
        ],
    )

    analysis = build_analysis(result, engine, model="test")

    roti, rajma, momos = analysis.items
    assert roti.matched and roti.food_id == "roti-id" and roti.grams == 120
    assert rajma.matched and rajma.food_name == "Rajma (Kidney Beans)"
    assert not momos.matched and momos.source == "ai_estimate"
    assert momos.grams == 800  # clamped
    assert momos.confidence <= 0.5
    assert any("Veg Momos" in n for n in analysis.notes)
    assert analysis.confidence == "moderate"
    assert analysis.totals.calories == pytest.approx(
        roti.nutrients.calories + rajma.nutrients.calories + momos.nutrients.calories, abs=0.2
    )


def test_build_analysis_not_food(engine: NutritionEngine) -> None:
    analysis = build_analysis(GeminiPlateResult(is_food=False, items=[]), engine, model="t")
    assert analysis.is_food is False and analysis.items == [] and analysis.confidence == "low"


# ---------- endpoints ----------

def _student() -> auth.CurrentUser:
    return auth.CurrentUser(id="u", role="student", bhawan_id="b")


def test_plate_analyze_requires_auth() -> None:
    res = client.post("/api/plate/analyze", files={"file": ("p.jpg", b"x", "image/jpeg")})
    assert res.status_code == 401


def test_plate_analyze_returns_breakdown(monkeypatch, engine: NutritionEngine) -> None:
    async def fake_analyze(image: bytes, mime_type: str, eng: NutritionEngine) -> PlateAnalysis:
        return build_analysis(
            GeminiPlateResult(is_food=True, items=[_detected("Roti", None, 80)]), eng, "fake"
        )

    monkeypatch.setattr("app.api.plate.analyze_plate", fake_analyze)
    app.dependency_overrides[auth.get_current_user] = _student
    app.dependency_overrides[get_engine] = lambda: engine
    try:
        res = client.post("/api/plate/analyze", files={"file": ("p.jpg", b"img", "image/jpeg")})
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    body = res.json()
    assert body["items"][0]["food_name"] == "Chapati / Roti"
    assert body["totals"]["calories"] == 192
    assert body["confidence"] == "high"


def test_food_search_and_calculate(engine: NutritionEngine) -> None:
    app.dependency_overrides[get_engine] = lambda: engine
    try:
        search = client.get("/api/nutrition/foods", params={"q": "dal"})
        calc = client.post(
            "/api/nutrition/calculate",
            json={"items": [{"food_name": "rice", "portion": "small"}]},
        )
    finally:
        app.dependency_overrides.clear()

    names = [f["name"] for f in search.json()["foods"]]
    assert "Arhar / Toor Dal" in names and "Dal Makhani" in names
    assert calc.status_code == 200
    assert calc.json()["items"][0]["grams"] == 108  # 180 * 0.6
