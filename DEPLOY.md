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
   | `SECRET_KEY` | Generate with `secrets.token_hex(32)`; never use the development default |
   | `ADMIN_STUDENT_IDS` | Optional comma-separated registered account IDs; empty by default |
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

## Authorization update rollout

Deploy the frontend and backend changes together: data requests now send bearer
tokens, and `/auth/me` accepts the Authorization header instead of a query token.
Existing users must sign in again; old reset links must be requested again.
No database migration is required for this update.

To enable admin screens, register an account, identify its `student_id` from the
registration response or database, then configure that ID in backend
`ADMIN_STUDENT_IDS` and restart the backend. This grants cross-account read/write
access; leave it empty when administrator access is unnecessary. The frontend
PIN gates do not grant backend privileges.

Public `/share/:id` links now show a privacy notice. Passwordless seeded profiles
are accessible only to a configured administrator. Normal users should register
and use their own profiles. Test two separate accounts after deployment to verify
that one cannot read or modify the other's data.
