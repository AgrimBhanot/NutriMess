# NutriMess

Mess menu, community chat and personalised nutrition for IIT Roorkee's
hostels (Bhawans). Installable as a phone app (PWA).

**Production URL:** https://nutrimess.vercel.app (see [docs/deployment.md](docs/deployment.md)) · **QR codes:** [`qr/`](qr/)

## What it does

| Students | Mess secretaries |
|----------|------------------|
| See this week's menu, today's meals highlighted | Upload a photo of the menu; Gemini reads it into an editable grid; publish |
| Scan a thali photo for calories and macros, correct portions, log it | Moderate the weekly bhawan chat and post notices |
| Track daily intake against personal targets; 30-day history | Manage complaints (acknowledge / in progress / resolve, reply) |
| Ask an AI assistant what to eat, grounded in their menu, meals and goals | Bhawan analytics: engagement, meals logged, complaint trends |
| Chat with their bhawan (resets weekly), share photos | |
| File complaints, optionally anonymous | |

Everything is scoped to the user's bhawan by Postgres Row Level Security.

## Architecture

```
frontend/   Next.js 16 PWA (App Router, TypeScript, Tailwind v4)  -> Vercel
backend/    FastAPI + Google Gemini (menu OCR, plate analysis, AI chat) -> Render
database/   Supabase Postgres schema, RLS, migrations, RLS audit  -> Supabase
scripts/    QR code / poster generator
qr/         Generated QR codes and printable posters
docs/       Setup, deployment, API, architecture, testing
```

The browser talks to Supabase directly for data, auth, storage and realtime
(RLS enforces access). It calls FastAPI only for Gemini-backed features; the
backend forwards the user's JWT to Supabase, so RLS applies there too.
See [docs/architecture.md](docs/architecture.md).

## Quick start (local)

```bash
# Frontend
cd frontend && cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm install && npm run dev                        # http://localhost:3000

# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env                              # Supabase URL/anon key + GEMINI_API_KEY
uvicorn app.main:app --reload                     # http://localhost:8000/docs
```

Full instructions: [docs/setup.md](docs/setup.md). Deploying:
[docs/deployment.md](docs/deployment.md).

## Tests

```bash
cd frontend && npm run lint && npm run type-check && npm test && npm run build
cd backend && python -m pytest
# Database access control (Supabase SQL editor; rolls itself back):
#   database/tests/rls_audit.sql
```

CI runs the frontend and backend checks on every push
([.github/workflows/ci.yml](.github/workflows/ci.yml)). Manual test plan:
[docs/testing.md](docs/testing.md).

## Team

Agrim (database, auth, chat) · Akshat (frontend, PWA) · Aditya (backend, AI)
