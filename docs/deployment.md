# Deployment

Target: frontend on **Vercel** (`https://nutrimess.vercel.app`), backend on
**Render** (free tier, Singapore), database on **Supabase**. Total cost: free.

Deploy in this order: backend → frontend → Supabase auth URLs → QR codes.

## 1. Backend on Render

1. Render dashboard → **New → Blueprint** → select the GitHub repo. Render
   reads `render.yaml` and creates `nutrimess-api` (Docker, `backend/`).
2. Enter the secret env vars when prompted:
   - `SUPABASE_ANON_KEY`: Supabase → Project Settings → API → anon key
   - `GEMINI_API_KEY`
3. Wait for the deploy, then open `https://<service>.onrender.com/api/health`.
   It should return `{"status":"healthy",...}`.

Free-tier services sleep after 15 minutes idle; the first request after that
takes ~30–60 s. The app handles it (the dashboard suggestion card simply
appears late). Upgrade the instance, or ping `/api/health` on a schedule,
before a demo.

If your Vercel URL ends up different from `nutrimess.vercel.app`, update
`CORS_ORIGINS` (and `CORS_ORIGIN_REGEX`) in Render.

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import the GitHub repo.
2. **Project name:** `nutrimess` (this gives `nutrimess.vercel.app`; if it is
   taken, note the URL you get; see step 5).
3. **Root Directory:** `frontend`. Framework preset: Next.js (auto).
4. Environment variables (Production and Preview):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://zvepctjxrvdtoyatpzqh.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `NEXT_PUBLIC_API_URL` | your Render URL, e.g. `https://nutrimess-api.onrender.com` |

5. Deploy. Pushes to `main` redeploy automatically.

## 3. Supabase configuration

Authentication → URL Configuration:

- Site URL: `https://nutrimess.vercel.app`
- Redirect URLs: add `https://nutrimess.vercel.app/**` and
  `https://nutrimess-*.vercel.app/**` (keep the localhost entry for dev)

Authentication → Providers → Email: enable **Confirm email** for production
and configure **custom SMTP** (e.g. Resend, Brevo; both have free tiers).
The built-in mailer's hourly limit is far too low for a campus launch.

Authentication → Attack Protection: enable **leaked password protection**.

### Google sign-in

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth
   client ID** → type **Web application**.
2. Authorized JavaScript origins: `https://nutrimess.vercel.app`,
   `http://localhost:3000`.
3. Authorized redirect URI:
   `https://zvepctjxrvdtoyatpzqh.supabase.co/auth/v1/callback`
4. Copy the client secret **immediately** (Google only shows it once).
5. Supabase → Providers → Google: put the web client ID in **Client IDs**
   (first if there are several) and the secret in **Client Secret (for OAuth)**.

`invalid_client` / "Unable to exchange external code" in the logs means the
secret doesn't belong to that client ID; generate a new secret and re-paste.

## 4. QR codes

```bash
pip install -r scripts/requirements.txt
python scripts/generate_qr.py --url https://nutrimess.vercel.app
```

Outputs go to `qr/`. The committed files already target
`https://nutrimess.vercel.app`; rerun with the real URL if it differs.

## 5. Post-deploy checklist

- [ ] `/api/health` on Render returns healthy
- [ ] Open the Vercel URL on a phone → login page loads
- [ ] Register with email → confirmation email arrives → sign in → dashboard
- [ ] Google sign-in → "Choose your Bhawan" → dashboard
- [ ] Secretary: upload a menu photo → AI extracts → publish → student sees it
- [ ] Scan a plate → items detected → log → appears in My Nutrition
- [ ] AI assistant answers with dishes from the published menu
- [ ] Two phones in one bhawan see each other's chat messages live
- [ ] Android Chrome shows "Install NutriMess"; iOS Safari Share → Add to Home Screen
- [ ] Scan a bhawan poster QR → register page with that bhawan preselected
- [ ] Run `database/tests/rls_audit.sql` → `RLS audit passed`
- [ ] Supabase advisors (Security) show no new findings
