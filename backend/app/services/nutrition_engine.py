import json
import logging
import re
import time
from difflib import SequenceMatcher
from pathlib import Path

import httpx

from app.config import get_settings
from app.models.nutrition import (
    CalculateItem,
    FoodRecord,
    Macros,
    NutrientBreakdown,
    NutrientLine,
    PORTION_FACTORS,
    Portion,
)

logger = logging.getLogger(__name__)

LOCAL_FOODS_PATH = Path(__file__).resolve().parent.parent / "data" / "mess_foods.json"
CACHE_TTL_SECONDS = 600
MATCH_THRESHOLD = 0.78


def _normalise(text: str) -> str:
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return " ".join(text.split())


# Generic names people (and Gemini) use for seeded DB foods, which carry no
# aliases of their own. Exact alias hits beat fuzzy ties like
# "rice" ~ "jeera rice".
COMMON_ALIASES: dict[str, list[str]] = {
    "Plain Rice (Steamed)": ["rice", "white rice", "chawal", "boiled rice"],
    "Chapati / Roti": ["phulka", "tawa roti", "fulka"],
    "Arhar / Toor Dal": ["dal", "daal", "plain dal"],
    "Mix Veg": ["mix vegetable", "mixed vegetables", "mixed veg"],
    "Seasonal Sabzi": ["sabzi", "sabji", "vegetable curry"],
    "Boiled Egg": ["egg", "eggs"],
    "Chicken Curry": ["chicken", "chicken gravy"],
    "Salad (Onion, Cucumber)": ["green salad", "onion", "cucumber"],
    "Kheer / Rice Pudding": ["kheer"],
}

# Parenthetical qualifiers that describe a dish rather than name it
DESCRIPTOR_WORDS = {"plain", "steamed", "toned", "roasted", "suji", "with milk and sugar", "red sauce", "sweet"}


def _aliases_for(name: str, extra: list[str]) -> set[str]:
    """'Chapati / Roti' -> {'chapati roti', 'chapati', 'roti'};
    'Rajma (Kidney Beans)' -> {'rajma kidney beans', 'rajma', 'kidney beans'}."""
    variants = {name, *extra}
    inner = [
        part for part in re.findall(r"\(([^)]*)\)", name)
        if _normalise(part) not in DESCRIPTOR_WORDS
    ]
    outer = re.sub(r"\([^)]*\)", "", name)
    variants.update(inner)
    variants.add(outer)
    for v in list(variants):
        variants.update(part for part in v.split("/"))
    return {n for n in (_normalise(v) for v in variants) if n}


def _record_from_row(row: dict) -> FoodRecord:
    return FoodRecord(
        id=row.get("id"),
        name=row["name"],
        category=row.get("category"),
        default_serving_unit=row.get("default_serving_unit"),
        default_grams=row.get("default_grams") or 100,
        per_100g=Macros(
            calories=row.get("calories_per_100g") or 0,
            protein=row.get("protein_per_100g") or 0,
            carbs=row.get("carbs_per_100g") or 0,
            fat=row.get("fat_per_100g") or 0,
            fiber=row.get("fiber_per_100g") or 0,
        ),
        source=row.get("source"),
        aliases=row.get("aliases") or [],
    )


class NutritionEngine:
    """Food lookup + nutrient calculation.

    Foods come from the Supabase `food_items` table (cached), merged with the
    bundled `mess_foods.json`. DB rows win on name clashes so `food_id` links
    are kept wherever possible.
    """

    def __init__(self) -> None:
        self._foods: list[FoodRecord] = []
        self._index: list[tuple[str, FoodRecord]] = []
        self._loaded_at = 0.0

    # ---------- loading ----------

    def _local_foods(self) -> list[FoodRecord]:
        data = json.loads(LOCAL_FOODS_PATH.read_text(encoding="utf-8"))
        return [_record_from_row(row) for row in data["foods"]]

    async def _db_foods(self) -> list[FoodRecord]:
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_api_key:
            return []
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.get(
                    f"{settings.supabase_url}/rest/v1/food_items",
                    params={"select": "*", "limit": "2000"},
                    headers={
                        "apikey": settings.supabase_api_key,
                        "Authorization": f"Bearer {settings.supabase_api_key}",
                    },
                )
            res.raise_for_status()
            return [_record_from_row(row) for row in res.json()]
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Could not load food_items from Supabase: %s", exc)
            return []

    def load(self, foods: list[FoodRecord]) -> None:
        self._foods = foods
        self._index = [
            (alias, food)
            for food in foods
            for alias in _aliases_for(food.name, food.aliases + COMMON_ALIASES.get(food.name, []))
        ]
        self._loaded_at = time.monotonic()

    async def ensure_loaded(self) -> None:
        if self._foods and time.monotonic() - self._loaded_at < CACHE_TTL_SECONDS:
            return
        db = await self._db_foods()
        db_names = {_normalise(f.name) for f in db}
        local = [f for f in self._local_foods() if _normalise(f.name) not in db_names]
        if not db and self._foods:
            # Keep the previous (possibly DB-backed) list if the refresh failed
            self._loaded_at = time.monotonic()
            return
        self.load(db + local)

    # ---------- lookup ----------

    @property
    def foods(self) -> list[FoodRecord]:
        return self._foods

    def match(self, name: str) -> tuple[FoodRecord | None, float]:
        """Best database match for a free-text food name, with a 0–1 score."""
        query = _normalise(name)
        if not query:
            return None, 0.0

        best: FoodRecord | None = None
        best_score = 0.0
        query_tokens = set(query.split())
        for alias, food in self._index:
            if alias == query:
                return food, 1.0
            score = SequenceMatcher(None, query, alias).ratio()
            alias_tokens = set(alias.split())
            # Whole-word containment either way ("rice" ~ "plain rice",
            # "rajma masala" ~ "rajma") counts as a match; closer overlap wins,
            # ties go to the first (seeded, more generic) food.
            if alias_tokens <= query_tokens or query_tokens <= alias_tokens:
                overlap = len(query_tokens & alias_tokens) / len(query_tokens | alias_tokens)
                score = max(score, 0.8 + 0.2 * overlap)
            if score > best_score:
                best, best_score = food, score

        if best_score >= MATCH_THRESHOLD:
            return best, round(best_score, 2)
        return None, round(best_score, 2)

    def search(self, query: str, limit: int = 15) -> list[FoodRecord]:
        q = _normalise(query)
        if not q:
            return self._foods[:limit]
        scored: dict[str, tuple[float, FoodRecord]] = {}
        for alias, food in self._index:
            if q in alias:
                score = 1.0 if alias.startswith(q) else 0.8
            else:
                score = SequenceMatcher(None, q, alias).ratio()
            if score >= 0.6 and score > scored.get(food.name, (0, food))[0]:
                scored[food.name] = (score, food)
        ranked = sorted(scored.values(), key=lambda s: (-s[0], s[1].name))
        return [food for _, food in ranked[:limit]]

    # ---------- calculation ----------

    @staticmethod
    def grams_for(food_default: float, portion: Portion, grams: float | None) -> float:
        if grams:
            return round(grams, 1)
        return round(food_default * PORTION_FACTORS[portion], 1)

    def line(
        self,
        *,
        food_name: str,
        portion: Portion,
        grams: float | None,
        fallback_per_100g: Macros | None = None,
        confidence: float = 1.0,
    ) -> NutrientLine | None:
        """Nutrients for one item. Falls back to an AI estimate when unmatched;
        returns None if there's nothing to base numbers on."""
        food, _score = self.match(food_name)
        if food is not None:
            g = self.grams_for(food.default_grams, portion, grams)
            return NutrientLine(
                food_name=food.name,
                food_id=food.id,
                matched=True,
                source=food.source or "custom",
                portion=portion,
                grams=g,
                default_grams=food.default_grams,
                serving_unit=food.default_serving_unit,
                per_100g=food.per_100g,
                nutrients=food.per_100g.scaled(g),
                confidence=confidence,
            )
        if fallback_per_100g is None:
            return None
        default = grams or 100
        g = self.grams_for(default, portion, grams)
        return NutrientLine(
            food_name=food_name,
            food_id=None,
            matched=False,
            source="ai_estimate",
            portion=portion,
            grams=g,
            default_grams=default,
            serving_unit=None,
            per_100g=fallback_per_100g,
            nutrients=fallback_per_100g.scaled(g),
            confidence=min(confidence, 0.5),
        )

    def calculate(self, items: list[CalculateItem]) -> NutrientBreakdown:
        lines = [
            line
            for item in items
            if (line := self.line(food_name=item.food_name, portion=item.portion, grams=item.grams))
        ]
        totals = sum((line.nutrients for line in lines), Macros())
        return NutrientBreakdown(items=lines, totals=totals)


_engine = NutritionEngine()


async def get_engine() -> NutritionEngine:
    await _engine.ensure_loaded()
    return _engine
