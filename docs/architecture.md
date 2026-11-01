# Architecture & key decisions

```
Phone (PWA) ──► Next.js on Azure Static Web Apps ──► Supabase (Postgres + Auth + Storage + Realtime)
                     │                        ▲
                     └──► FastAPI on Azure App Service ──┘ (with the user's JWT)
                                │
                                └──► Google Gemini
```

## Access control

- **Bhawan is the boundary.** Every row is scoped by `bhawan_id`; RLS
  policies compare it with `get_user_bhawan(auth.uid())`. The helper
  functions only answer for the calling user.
- **Roles can't be self-assigned.** The signup trigger grants `secretary`
  only if the 16-bit `secretary_hash` matches; a `BEFORE UPDATE` guard
  rejects role changes and stops secretaries switching bhawan. The hash
  column isn't readable by API roles, and verification is throttled
  (5 failures / hour / account).
- **Privileged actions are RPCs** that check the caller inside:
  `publish_menu`, `get_bhawan_complaints` (hides anonymous reporters),
  `respond_to_complaint`, `get_bhawan_analytics` (aggregates only),
  `ensure_current_chat_week`, `promote_to_secretary`.
- **The backend has no service key.** It forwards the user's JWT, so it can
  never read more than the user could.
- `database/tests/rls_audit.sql` asserts all of the above.

## Weekly chat

One active `chat_weeks` row per bhawan. `ensure_current_chat_week()` runs
when someone opens chat: if it's a new IST week it deactivates the old week
and starts a new one (linking that week's published menu). Publishing the
current week's menu also rotates it. Old messages stay in the database
(soft archive) but the UI only shows the active week. Messages are delivered
with Realtime `postgres_changes`, which applies RLS per subscriber. Author
name/role are copied onto each message by a trigger, so students never need
read access to other students' profiles.

## Menu pipeline

Secretary uploads photo → stored in `menu-images/{bhawan}/` → FastAPI sends
it to Gemini with a JSON schema → normalised (day/meal aliases, dedupe) →
editable grid → `save_menu_items` (atomic replace) → `publish_menu`.
Students without a menu for the current week see the most recent one, with
a notice.

## Plate analysis & nutrition

Gemini receives the photo plus the list of known foods, and returns items
with estimated grams and its own per-100 g estimate. The nutrition engine
matches names (exact aliases, then fuzzy/token matching) against
`food_items` (IFCT 2017-based seed + mess dishes) merged with
`backend/app/data/mess_foods.json`. Unmatched dishes fall back to the AI
estimate and are flagged. The user corrects portions before saving to
`meal_logs` / `meal_log_items`.

Daily targets use Mifflin-St Jeor with a sex-neutral constant (the profile
has no sex field), activity factor, and goal adjustment. The same formula
exists in `frontend/src/lib/nutrition.ts` and
`backend/app/services/recommender.py`, and tests pin both to the same numbers.

## AI assistant

`context_builder` reads (as the user) profile, this week's menu, today's and
the last 7 days' meal logs, and computes the next meal. The rule-based
`recommender` scores that meal's dishes for the user's goal, diet and
allergies. Both go into the Gemini system prompt; the last 12 turns are sent
as history.

## Time

All "today"/"this week" logic uses Asia/Kolkata (servers run in UTC), in
`lib/week.ts`, `ist_today()` in SQL, and `zoneinfo` in Python.

## PWA

`public/manifest.json`, generated icons, and a hand-written `public/sw.js`
(network-first navigation with an offline page; cache-first for hashed
static assets; never caches per-user pages or cross-origin API calls).
Registered in production only. Serwist was planned but needs webpack;
Next 16 builds with Turbopack.
