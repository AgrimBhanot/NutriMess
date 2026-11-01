# Local development setup

## Prerequisites

- Node.js 20.9+ (22 recommended)
- Python 3.11+ (CI uses 3.12)
- A Supabase project (the team project is `zvepctjxrvdtoyatpzqh`)
- A Google Gemini API key (https://aistudio.google.com/apikey, free tier works)

## 1. Database

On a **new** Supabase project, run these in the SQL editor, in order:

1. `database/schema.sql`
2. `database/seed.sql`
3. `database/functions.sql`
4. `database/rls_policies.sql`
5. Every file in `database/migrations/` in numeric order (see its README)

Then set a 4-hex-digit secretary hash for each bhawan (share it privately
with that bhawan's secretary only):

```sql
UPDATE bhawans SET secretary_hash = '8F42' WHERE code = 'RB';
```

Verify access control with `database/tests/rls_audit.sql`; it should end with
`RLS audit passed` and roll everything back.

## 2. Supabase Auth settings

Authentication → URL Configuration:

- **Site URL:** `http://localhost:3000` (production: `https://nutrimess.vercel.app`)
- **Redirect URLs:** `http://localhost:3000/**`, `https://nutrimess.vercel.app/**`,
  `https://nutrimess-*.vercel.app/**` (preview deployments)

Authentication → Providers → Email: while developing, turn off **Confirm
email** or configure custom SMTP. Supabase's built-in mailer only sends a
few emails per hour, which shows up as `email rate limit exceeded`.

Google sign-in: see [deployment.md](deployment.md#google-sign-in).

## 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon key (public by design) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

Notes for Next.js 16: request interception lives in `src/proxy.ts` (formerly
`middleware.ts`); read `node_modules/next/dist/docs/` before using
unfamiliar APIs. The service worker only registers in production builds
(`npm run build && npm start`).

## 4. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload
```

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | same as the frontend |
| `SUPABASE_ANON_KEY` | same anon key; user JWTs carry the actual permissions |
| `GEMINI_API_KEY` | your Gemini key (without it, AI endpoints return 503) |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `CORS_ORIGINS` | `http://localhost:3000` |
| `AI_REQUESTS_PER_WINDOW` / `AI_WINDOW_SECONDS` | per-user Gemini quota (default 30 per 10 min) |

Interactive API docs: http://localhost:8000/docs.

## Creating test accounts

- **Student:** register at `/register`, pick a bhawan.
- **Secretary:** register via "Mess Secretary? Register here" with the
  bhawan's hash, or as a student and use "Are you the mess secretary?" on
  the profile page. Five wrong hashes lock that account out for an hour.
