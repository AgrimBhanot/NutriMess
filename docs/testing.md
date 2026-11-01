# Testing

## Automated

| Suite | Command | Covers |
|-------|---------|--------|
| Frontend unit | `cd frontend && npm test` | IST week maths, nutrition targets/portions, meal times, menu grid |
| Frontend static | `npm run lint && npm run type-check && npm run build` | Lint, strict TS, production build |
| Backend | `cd backend && python -m pytest` | Menu normalisation, food matching, plate analysis, recommender, AI chat flow, auth/role guards, rate limiting |
| Database | run `database/tests/rls_audit.sql` in the SQL editor | Bhawan isolation, role guards, anonymity, hidden hash (self-rolling-back) |

All of these run in CI except the database audit (it needs a Supabase project).

## Manual test plan

Use two phones (or a phone + desktop) and three accounts: student A and
secretary S in the same bhawan, student B in another bhawan.

**Auth**
1. Register A with email; confirm; sign in → dashboard shows A's bhawan.
2. Google sign-in with a new account → "Choose your Bhawan" → dashboard.
3. Register as secretary with a wrong hash → lands as student with a notice.
   Profile → "Are you the mess secretary?" → correct hash → Secretary Portal.

**Menu**
4. S uploads a menu photo for this week → AI fills the grid → fix an item →
   Publish. A sees it on Menu and Dashboard; B does not.

**Chat**
5. A and S in the bhawan chat: messages appear live on both; S has the
   "Mess Secy" badge; reply and delete work; photo attachment shows for both.
6. B's chat shows none of it.

**Plate scan**
7. A scans a thali → foods + portions → change a portion, add a missed food
   → Log → My Nutrition shows the meal and updated totals.
8. Deny camera permission → upload fallback works.

**Nutrition & AI**
9. Fill A's profile (age/height/weight/goal) → targets change on Dashboard.
10. Ask the assistant "What should I eat for dinner?" → reply names dishes
    from the published menu and respects diet/allergies.

**Complaints**
11. A files an anonymous complaint with a photo → S sees it without A's name,
    sets "In Progress" with a reply → A sees the status and reply.

**PWA & responsive**
12. Android Chrome: install prompt → installs → opens standalone.
    iOS Safari: Share → Add to Home Screen.
13. Turn on airplane mode → navigating shows the offline page.
14. Check 375 px, 768 px and 1280 px widths.
