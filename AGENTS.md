# AGENTS.md — NutriMess Development Guidelines

## Project Overview
NutriMess is a Progressive Web App (PWA) for IIT Roorkee campus mess management and personalized nutrition. It serves students and mess secretaries across 5 Bhawans (Vivekanand, Rajiv, Govind, Jawahar, Himalaya).

## Architecture
```
frontend/          Next.js 14+ (App Router, TypeScript, Tailwind, shadcn/ui, Serwist PWA)
backend/           FastAPI (Python 3.11+)
database/          Supabase PostgreSQL (schema, seeds, RLS policies, functions)
```

## Tech Stack
- **Frontend:** Next.js 14+ App Router, TypeScript (strict), Tailwind CSS, shadcn/ui, Serwist (PWA)
- **Backend:** FastAPI, Python 3.11+, Pydantic v2
- **Database:** Supabase PostgreSQL + Auth + Storage + Realtime
- **AI/ML:** Google Gemini API (multimodal, free tier)
- **Nutrition:** IFCT 2017 (seeded) + USDA FoodData Central (fallback)
- **Deploy:** Vercel (frontend), Render (backend), Supabase Cloud (DB)

## Design System — "Forestry & Terracotta Modern"
Strict adherence required. No emojis in UI chrome.

### Colors (60/30/10 Rule)
| Token           | Value     | Usage                                |
|-----------------|-----------|--------------------------------------|
| `--bg-base`     | `#F9FAFB` | 60% — page background (porcelain)    |
| `--bg-surface`  | `#FFFFFF` | Card surfaces, containers            |
| `--border`      | `#E5E7EB` | Hairline borders                     |
| `--text-primary`| `#111827` | Headings, primary text               |
| `--text-secondary`| `#4B5563`| Body text, descriptions             |
| `--text-muted`  | `#9CA3AF` | Metadata, captions                   |
| `--brand-pine`  | `#244E3D` | 10% — primary controls, CTA buttons  |
| `--brand-terra` | `#BA5D38` | Accent — badges, alerts, protein     |

### Typography
- **Typeface:** Inter (Google Fonts)
- **Max sizes:** 4 (display, heading, body, caption)
- **Weights:** Medium (500), Semibold (600)
- **Numbers:** Tabular (monospace) for calories, macros

### Spacing & Grid
- 8-point spatial rhythm
- Cards: `border-radius: 16px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.04)`
- Icons: 1.5px stroke, Lucide icon set

## Coding Standards

### TypeScript / Frontend
- Strict TypeScript (`strict: true`)
- Use `@/` path aliases for imports
- Components in `src/components/`, pages in `src/app/`
- Prefer server components; use `'use client'` only when needed
- Name files in kebab-case, components in PascalCase
- Use Supabase SSR helpers for server-side auth

### Python / Backend
- Type hints on all functions
- Pydantic v2 models for request/response validation
- Async endpoints (`async def`)
- Environment variables via `pydantic-settings`
- Tests in `tests/` with pytest

### Database
- All tables have RLS enabled
- UUIDs for primary keys
- `created_at TIMESTAMPTZ DEFAULT now()` on every table
- Data is scoped by `bhawan_id` — this is the core access control boundary

## Key Architectural Decisions
1. **Bhawan Lock-in:** Students belong to exactly ONE bhawan. All data is scoped by `bhawan_id`.
2. **Weekly Chat Cycle:** Chat rooms reset weekly (soft-delete via `is_active` flag on `chat_weeks`).
3. **Secretary Auth:** 16-bit hash per bhawan for secretary verification.
4. **Auth:** Supabase Auth with Google OAuth (`@iitr.ac.in`) + email/password.
5. **Image Processing:** FastAPI handles all Gemini API calls (menu OCR, plate analysis, AI chat).
6. **PWA First:** Mobile-first design, installable on home screen, camera access for plate scanning.

## Environment Variables

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
GEMINI_API_KEY=
CORS_ORIGINS=http://localhost:3000
```

## Git Workflow
- Branch from `main` for features
- Commit messages: `feat:`, `fix:`, `chore:`, `docs:` prefixes
- No secrets in code — use `.env` files (gitignored)
