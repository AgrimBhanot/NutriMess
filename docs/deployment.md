# Deployment (Azure)

| Part | Service | URL |
|------|---------|-----|
| Frontend | Azure Static Web Apps "NutriMess" (hybrid Next.js) | https://kind-coast-021723100.1.azurestaticapps.net |
| Backend | Azure App Service "NutriMess-backend" (Linux, Python) | https://nutrimess-backend-fbb3fwemg4evckah.eastasia-01.azurewebsites.net |
| Database/Auth | Supabase project `zvepctjxrvdtoyatpzqh` | |

## How deploys work

Pushing to `main` triggers GitHub Actions; each workflow only runs when its
part of the repo changed:

| Workflow | Runs when | Does |
|----------|-----------|------|
| `ci.yml` | every push / PR | lint, type-check, unit tests, build; backend pytest |
| `azure-static-web-apps-kind-coast-021723100.yml` | `frontend/**` changes | Azure's Oryx builds `frontend/` (`npm run build` → standalone Next.js) and deploys it. PRs get a temporary preview URL, removed when the PR closes |
| `azure-backend.yml` | `backend/**` changes | runs pytest, zips `backend/app` + `requirements.txt`, deploys with the publish profile, then polls `/api/health` |

Both deploy workflows can also be run by hand: GitHub → Actions → pick the
workflow → **Run workflow**.

## One-time setup

### GitHub repository secrets
(Settings → Secrets and variables → Actions)

| Secret | Value |
|--------|-------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_KIND_COAST_021723100` | created by Azure already |
| `AZURE_BACKEND_PUBLISH_PROFILE` | contents of the backend's downloaded publish profile |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key |

If a publish profile is ever shared (chat, screenshot), reset it in the
portal (App Service → Overview → **Reset publish profile**), download the
new one and update the secret.

### Backend App Service (portal → NutriMess-backend)

**Settings → Configuration → General settings**

- Stack: **Python 3.12**
- Startup command:
  ```
  gunicorn --worker-class uvicorn.workers.UvicornWorker --workers 1 --timeout 120 --bind 0.0.0.0:8000 app.main:app
  ```
  (one async worker handles many concurrent requests and keeps the
  in-memory AI quota exact; `--timeout 120` leaves room for Gemini calls)
- SCM Basic Auth Publishing Credentials: **On** (needed for publish-profile deploys)

**Settings → Environment variables (App settings)**

| Name | Value |
|------|-------|
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` (installs requirements.txt on deploy) |
| `SUPABASE_URL` | `https://zvepctjxrvdtoyatpzqh.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key |
| `GEMINI_API_KEY` | your Gemini key |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `CORS_ORIGINS` | `https://kind-coast-021723100.1.azurestaticapps.net,http://localhost:3000` |
| `CORS_ORIGIN_REGEX` | `https://kind-coast-021723100-\d+\.[a-z0-9]+\.1\.azurestaticapps\.net` (PR previews) |

**Monitoring → Health check**: path `/api/health`.

### Frontend Static Web App (portal → NutriMess)

**Settings → Environment variables** (used at request time for server
rendering; the workflow supplies the same values at build time):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zvepctjxrvdtoyatpzqh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_API_URL` | `https://nutrimess-backend-fbb3fwemg4evckah.eastasia-01.azurewebsites.net` |

Plan: hybrid Next.js works on the **Free** plan too; Standard is only needed
for custom auth, linked backends or the SLA. Switching to Free (Hosting
plan) saves Azure for Students credit.

Hybrid Next.js on Static Web Apps is a **preview** feature. If a deploy
builds but pages fail at runtime, check the workflow log and the SWA
**Environments** blade; the fallback is hosting the frontend on a second
App Service (Node 22) using the same standalone build (`node server.js`).

### Supabase

Authentication → URL Configuration:

- Site URL: `https://kind-coast-021723100.1.azurestaticapps.net`
- Redirect URLs: `https://kind-coast-021723100.1.azurestaticapps.net/**`,
  `https://kind-coast-021723100-*.azurestaticapps.net/**` (PR previews),
  `http://localhost:3000/**`

Authentication → Providers → Email: enable **Confirm email** and set up
**custom SMTP** (Resend/Brevo free tiers); the built-in mailer only sends a
few emails per hour. Attack Protection: enable **leaked password protection**.

### Google sign-in

Google Cloud Console → Credentials → your **Web application** OAuth client:

- Authorized JavaScript origins: `https://kind-coast-021723100.1.azurestaticapps.net`,
  `http://localhost:3000`
- Authorized redirect URI: `https://zvepctjxrvdtoyatpzqh.supabase.co/auth/v1/callback`

Supabase → Providers → Google: the web client ID in **Client IDs** (first),
its secret in **Client Secret (for OAuth)**. `invalid_client` in the auth
logs means the secret doesn't match that client ID; add a new secret in
Google (it's shown only once) and re-paste.

## Backend region (Gemini availability)

Google's Gemini API is geo-restricted and is **not available from Azure East
Asia (Hong Kong)**; calls fail with "User location is not supported". Host
the backend in a supported region, e.g. **Central India** (closest to
Roorkee) or **Southeast Asia** (Singapore).

Moving the App Service:

1. Portal → Create **Web App**: Linux, Python 3.12, region **Central India**,
   same resource group. Apply the settings from
   [Backend App Service](#backend-app-service-portal--nutrimess-backend)
   (startup command, env vars, health check, SCM basic auth).
2. Download its publish profile → update the `AZURE_BACKEND_PUBLISH_PROFILE` secret.
3. GitHub → Settings → Secrets and variables → Actions → **Variables**:
   `BACKEND_APP_NAME` = the new app's name, `BACKEND_URL` = its full URL **including `https://`**, no trailing `/`
   (both workflows read these; no code change).
4. Static Web App → Environment variables: update `NEXT_PUBLIC_API_URL`.
5. Actions → run **Deploy backend**, then **Deploy frontend** (the API URL
   is compiled into the frontend at build time).
6. Delete the old East Asia app once the new one is healthy.

## QR codes

`qr/` targets the Azure URL. If the app moves (e.g. a custom domain):

```bash
pip install -r scripts/requirements.txt
python scripts/generate_qr.py --url https://your-domain
```

## Post-deploy checklist

- [ ] Backend workflow ends with "Backend healthy"
- [ ] Frontend workflow succeeds; the Azure URL shows the NutriMess login page
- [ ] Register with email → confirmation email → sign in → dashboard
- [ ] Google sign-in → "Choose your Bhawan" → dashboard
- [ ] Secretary: upload menu photo → AI extracts → publish → student sees it
- [ ] Scan a plate → foods detected → log → appears in My Nutrition
- [ ] AI assistant answers using dishes from the published menu
- [ ] Two phones in one bhawan see each other's chat live
- [ ] Android Chrome offers "Install NutriMess"; iOS Safari → Add to Home Screen
- [ ] A bhawan poster QR opens /register with that bhawan selected
- [ ] `database/tests/rls_audit.sql` → `RLS audit passed`

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Azure placeholder page / 404 on `/login` | Frontend workflow failed or `app_location` isn't `frontend` |
| Pages load but sign-in or data fails | `NEXT_PUBLIC_*` missing at build time (workflow `env`) or in SWA env vars |
| "Could not reach the NutriMess server" | Backend down: App Service → Log stream; check startup command and app settings |
| Browser console CORS error | `CORS_ORIGINS` on the backend doesn't include the exact frontend origin |
| AI features return 503 | `GEMINI_API_KEY` missing in App Service settings |
| "AI service isn't available from this server's region" | Backend region not supported by Gemini; see [Backend region](#backend-region-gemini-availability) |
| Google sign-in lands on an unreachable host like `d38c74da8e20` | Fixed: `/auth/callback` uses relative redirects (the SWA backend sees an internal host) |
| Phone says the site can't use the camera | Opened in an in-app browser (QR scanner, WhatsApp) or permission denied; open in Chrome/Safari, or use "Take photo" |
| Backend deploy 401 | Publish profile reset or SCM basic auth disabled; update the secret |
