# NutriMess

AI-powered mess nutrition tracker and community platform for IIT Roorkee.

## Features

- **Bhawan-scoped**: 5 Bhawans (Vivekanand, Rajiv, Govind, Jawahar, Himalaya)
- **Weekly Menu**: Secretary uploads menu image → AI extracts → Students view
- **Plate Scanner**: Camera-based food recognition with nutrition breakdown
- **Community Chat**: Per-bhawan weekly chat rooms with realtime messaging
- **AI Nutrition Assistant**: Personalized advice based on your profile and today's menu
- **Complaints**: File and track mess complaints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind v4, shadcn/ui) |
| Auth | Supabase Auth (Google OAuth + Email/Password) |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime |
| Backend | FastAPI (Python) |
| AI | Google Gemini API (multimodal) |
| Nutrition | IFCT 2017 + USDA FoodData Central |
| Deploy | Vercel + Render + Supabase Cloud |

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase account

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in Supabase credentials
npm install
npm run dev
```

### Backend

```bash
cd backend
cp .env.example .env
# Fill in API keys
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Database

1. Create a Supabase project
2. Run the SQL files in order:
   ```
   database/schema.sql
   database/seed.sql
   database/functions.sql
   database/rls_policies.sql
   ```

## Project Structure

```
NutriMess/
├── frontend/          Next.js PWA
├── backend/           FastAPI Python API
├── database/          SQL schema, seeds, RLS policies
├── designs/           UI design mockups
└── AGENTS.md          Development guidelines
```

## Design System

**Forestry & Terracotta Modern** — a minimalist editorial light-mode design:

- **Pine Green** `#244E3D` — primary controls
- **Terracotta** `#BA5D38` — accents, alerts
- **Porcelain** `#F9FAFB` — page background
- **Inter** — single typeface, tabular numbers for nutrition data

## License

MIT
