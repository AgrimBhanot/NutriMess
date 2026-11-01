# Backend API

Base URL: `NEXT_PUBLIC_API_URL` (local `http://localhost:8000`). Interactive
docs at `/docs`.

Authenticated endpoints take the Supabase access token:
`Authorization: Bearer <session.access_token>`. The backend validates it with
Supabase and uses it for all database reads/writes, so RLS applies.

Gemini-backed endpoints share a per-user quota (default 30 requests per 10
minutes); over it they return `429` with `Retry-After`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | none | Liveness check |
| POST | `/api/menu/extract` | secretary, quota | Menu photo → structured items |
| POST | `/api/plate/analyze` | user, quota | Plate photo → foods, portions, nutrients |
| GET | `/api/nutrition/foods?q=&limit=` | none | Search the food database |
| POST | `/api/nutrition/calculate` | none | Nutrients for named foods + portions |
| POST | `/api/chat` | user, quota | AI nutrition assistant |
| GET | `/api/chat/recommendations` | user | Rule-based picks for the next meal (no AI) |

## POST /api/menu/extract

`multipart/form-data` with `file` (JPEG/PNG/WebP/HEIC, ≤ 10 MB).

```json
{
  "items": [{"day": "monday", "meal": "lunch", "item_name": "Rajma", "item_order": 0}],
  "warnings": ["Thursday dinner unreadable"],
  "model": "gemini-2.5-flash"
}
```

## POST /api/plate/analyze

`multipart/form-data` with `file`.

```json
{
  "is_food": true,
  "items": [{
    "food_name": "Chapati / Roti", "food_id": "uuid-or-null", "matched": true,
    "source": "IFCT2017", "portion": "medium", "grams": 80, "default_grams": 40,
    "serving_unit": "piece",
    "per_100g": {"calories": 240, "protein": 7.5, "carbs": 50, "fat": 1.5, "fiber": 3.5},
    "nutrients": {"calories": 192, "protein": 6, "carbs": 40, "fat": 1.2, "fiber": 2.8},
    "confidence": 0.9
  }],
  "totals": {"calories": 192, "protein": 6, "carbs": 40, "fat": 1.2, "fiber": 2.8},
  "confidence": "high",
  "notes": [],
  "model": "gemini-2.5-flash"
}
```

`source: "ai_estimate"` means the dish isn't in the food database and the
numbers are Gemini's estimate (`matched: false`).

## POST /api/nutrition/calculate

```json
{"items": [{"food_name": "roti", "grams": 80}, {"food_name": "rajma", "portion": "large"}]}
```

Returns `{items: NutrientLine[], totals}`; unknown foods are omitted.

## POST /api/chat

```json
{"message": "What should I eat for dinner?", "session_id": null}
```

Omit/null `session_id` to start a conversation. Returns
`{session_id, reply, suggestions}`. Messages are stored in
`ai_chat_sessions` / `ai_chat_messages`.

## GET /api/chat/recommendations

```json
{
  "meal": "dinner", "day": "today", "menu_available": true,
  "targets": {...}, "eaten_today": {...},
  "suggestions": [{"food_name": "Rajma (Kidney Beans)", "grams": 150, "kind": "recommended",
                   "reason": "Helps with the 40g protein you still need today", ...}]
}
```

## Errors

| Status | Meaning |
|--------|---------|
| 401 | Missing/expired token |
| 403 | Not allowed (e.g. student calling menu extract) |
| 413 / 415 | Image too large / unsupported type |
| 429 | AI quota exceeded |
| 502 | Gemini or Supabase failed |
| 503 | `GEMINI_API_KEY` or Supabase not configured |
