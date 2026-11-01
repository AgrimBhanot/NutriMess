# Database migrations

Apply in order on top of `schema.sql`, `seed.sql`, `rls_policies.sql` and
`functions.sql` (Supabase SQL editor, or `apply_migration` via MCP).

| File | What it does |
|------|--------------|
| `001_auth_security_hardening.sql` | Secretary role only via verified hash; profile guard trigger; hides `bhawans.secretary_hash`; fixes complaint RLS |
| `002_week2_menu_chat_complaints.sql` | Menu publish + chat-week rotation RPCs, complaint RPCs, storage buckets, Realtime for chat |
| `003_rls_performance_and_helper_lockdown.sql` | RLS helpers answer only for the caller; `(select auth.uid())` policies; FK indexes |
| `004_week3_mess_foods.sql` | 40 extra IITR mess dishes in `food_items` (generated from `backend/app/data/mess_foods.json`) |
| `005_week4_chat_images_analytics.sql` | `chat-images` bucket, image-only chat messages, `get_bhawan_analytics()` for secretaries |
| `006_secretary_hash_throttle.sql` | Hash verification internal-only; 5 failed secretary attempts per hour per account |

Access-control audit (self-rolling-back): `../tests/rls_audit.sql`.
