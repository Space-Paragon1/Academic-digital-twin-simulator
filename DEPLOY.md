# Deployment Guide

## Backend → Railway

1. **Push your project to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "ready for deployment"
   git push origin main
   ```

2. **Create a Railway project**
   - Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
   - Select your repository
   - Set **Root Directory** to `backend`
   - Railway auto-detects `railway.toml` — no further build config needed

3. **Set environment variables** in the Railway dashboard:
   | Key | Value |
   |-----|-------|
   | `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app` |
   | `SECRET_KEY` | (generate a random 32-char string) |
   | `DATABASE_URL` | `sqlite:///./academic_twin.db` (or a Postgres URL) |

4. **Deploy** — Railway builds and starts the server automatically.
   Your backend URL will be something like `https://academic-digital-twin-backend.up.railway.app`

5. **Test it**: Visit `https://your-backend.railway.app/health` — should return `{"status":"ok"}`

---

## Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub

2. **Configure the project:**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `frontend`

3. **Set environment variable:**
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://your-backend.railway.app` |

4. Click **Deploy** — Vercel builds and publishes automatically.
   Your frontend URL will be something like `https://academic-digital-twin.vercel.app`

5. **Update CORS on Railway**: Go back to Railway and set:
   ```
   CORS_ORIGINS=https://academic-digital-twin.vercel.app
   ```

---

## Post-Deployment Checklist

- [ ] Visit `/health` on the backend URL — returns `{"status":"ok"}`
- [ ] Visit the frontend URL — landing page loads
- [ ] Register a new account at `/login`
- [ ] Add courses, run a simulation — data persists
- [ ] Open `/advisor` — AI chat responds
- [ ] Test dark mode toggle

---

## Notes

- **SQLite on Railway**: The free tier uses ephemeral storage, meaning the database
  resets on redeploy. For persistent data, add a Railway **PostgreSQL** plugin and
  update `DATABASE_URL` to the provided Postgres connection string.
- **Secret key**: Never use the default `dev-secret-change-in-production` in production.
  Generate one with: `python -c "import secrets; print(secrets.token_hex(32))"`
