# NutriMess frontend

Next.js 16 (App Router) PWA. See the [root README](../README.md) and
[docs/setup.md](../docs/setup.md).

```bash
cp .env.local.example .env.local   # Supabase URL, anon key, API URL
npm install
npm run dev          # http://localhost:3000
npm test             # vitest unit tests
npm run type-check
npm run build        # production build (service worker registers only here)
```

Layout: `src/app` routes (`(auth)`, `(student)`, `(secretary)` groups),
`src/components` UI by feature, `src/lib` data/helpers (Supabase clients,
IST week maths, nutrition), `src/proxy.ts` auth/role routing.
