from fastapi.testclient import TestClient

from app.main import app
from app.models.menu import Day, GeminiMenuEntry, GeminiMenuResult, Meal, MenuExtractionResponse
from app.services import auth
from app.services.menu_parser import normalise_menu

client = TestClient(app)


def _secretary() -> auth.CurrentUser:
    return auth.CurrentUser(id="u1", role="secretary", bhawan_id="b1")


def _student() -> auth.CurrentUser:
    return auth.CurrentUser(id="u2", role="student", bhawan_id="b1")


# ---------- normalise_menu ----------

def test_normalise_maps_aliases_and_dedupes() -> None:
    raw = GeminiMenuResult(
        entries=[
            GeminiMenuEntry(day="Mon", meal="Breakfast", items=["poha", "Jalebi", "POHA", " "]),
            GeminiMenuEntry(day="monday", meal="Evening Tea", items=["samosa"]),
            GeminiMenuEntry(day="Thurs", meal="dinner", items=["Paneer\nButter Masala"]),
        ],
        notes=["Tea and milk served daily"],
    )

    result = normalise_menu(raw, model="test")

    assert [(i.day, i.meal, i.item_name, i.item_order) for i in result.items] == [
        (Day.monday, Meal.breakfast, "Poha", 0),
        (Day.monday, Meal.breakfast, "Jalebi", 1),
        (Day.monday, Meal.snacks, "Samosa", 0),
        (Day.thursday, Meal.dinner, "Paneer Butter Masala", 0),
    ]
    assert result.warnings == ["Tea and milk served daily"]


def test_normalise_reports_unknown_slots_and_empty_menu() -> None:
    raw = GeminiMenuResult(entries=[GeminiMenuEntry(day="Funday", meal="lunch", items=["Rice"])])

    result = normalise_menu(raw, model="test")

    assert result.items == []
    assert any("Funday" in w for w in result.warnings)
    assert any("No menu items" in w for w in result.warnings)


# ---------- /api/menu/extract ----------

def test_extract_requires_auth() -> None:
    res = client.post("/api/menu/extract", files={"file": ("m.png", b"x", "image/png")})
    assert res.status_code == 401


def test_extract_rejects_students() -> None:
    app.dependency_overrides[auth.get_current_user] = _student
    try:
        res = client.post("/api/menu/extract", files={"file": ("m.png", b"x", "image/png")})
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 403


def test_extract_rejects_non_images() -> None:
    app.dependency_overrides[auth.require_secretary] = _secretary
    try:
        res = client.post("/api/menu/extract", files={"file": ("m.pdf", b"x", "application/pdf")})
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 415


def test_extract_returns_parsed_menu(monkeypatch) -> None:
    async def fake_extract(image: bytes, mime_type: str) -> MenuExtractionResponse:
        assert image == b"img" and mime_type == "image/jpeg"
        return normalise_menu(
            GeminiMenuResult(entries=[GeminiMenuEntry(day="sunday", meal="lunch", items=["Rajma"])]),
            model="fake",
        )

    monkeypatch.setattr("app.api.menu.extract_menu_from_image", fake_extract)
    app.dependency_overrides[auth.require_secretary] = _secretary
    try:
        res = client.post("/api/menu/extract", files={"file": ("m.jpg", b"img", "image/jpeg")})
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    body = res.json()
    assert body["items"] == [
        {"day": "sunday", "meal": "lunch", "item_name": "Rajma", "item_order": 0}
    ]
    assert body["model"] == "fake"
