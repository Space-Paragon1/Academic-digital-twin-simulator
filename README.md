# Academic Digital Twin Simulator

> A simulation engine that models a student as a dynamic system and predicts GPA, burnout risk, cognitive load, and optimal schedules under different academic workload scenarios. Includes JWT authentication, an AI advisor powered by Claude, Monte Carlo confidence bands, goal targeting, multi-student monitoring, and Canvas LMS integration.

## Architecture

```
Academic-digital-twin-simulator/
├── backend/          Python · FastAPI · SQLAlchemy · numpy/scipy · Anthropic SDK
├── frontend/         Next.js 15 · TypeScript · Tailwind CSS · Recharts
├── DEPLOY.md         Railway + Vercel deployment guide
└── DEMO.md           5-minute demo script for professors / hackathons
```

```
                    ┌──────────────────────────────────────────┐
                    │             Next.js Frontend              │
                    │  Dashboard · Scenarios · Compare          │
                    │  Optimizer · Advisor · Profile · Login    │
                    └────────────┬─────────────────────────────┘
                                 │  REST API
                    ┌────────────▼─────────────────────────────┐
                    │           FastAPI Backend                 │
                    │   /api/v1/auth  (register · login · me)  │
                    │   /api/v1/students                        │
                    │   /api/v1/courses                         │
                    │   /api/v1/simulations                     │
                    │   /api/v1/simulations/monte-carlo         │
                    │   /api/v1/scenarios/optimize              │
                    │   /api/v1/advisor/chat                    │
                    │   /api/v1/advisor/goal-target             │
                    │   /api/v1/canvas/preview                  │
                    └────────────┬─────────────────────────────┘
                                 │
                    ┌────────────▼─────────────────────────────┐
                    │         Simulation Engine                 │
                    │  TimeSystem · CognitiveLoad · Retention   │
                    │  Performance · Recovery · Optimizer       │
                    └────────────┬─────────────────────────────┘
                                 │
                    ┌────────────▼─────────────────────────────┐
                    │           SQLite Database                 │
                    │  students · courses · simulation_runs     │
                    │  actual_grades                            │
                    └──────────────────────────────────────────┘
```

---

## Quick Start

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Activate (choose your shell):
source .venv/Scripts/activate      # Git Bash / WSL
.venv\Scripts\Activate.ps1         # PowerShell
.venv\Scripts\activate.bat         # Command Prompt

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env

# (Optional) Add your Anthropic API key for the AI Advisor
# Edit .env and set: ANTHROPIC_API_KEY=sk-ant-...

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:3000`

> **Both servers must be running simultaneously.** Keep each in its own terminal.

### Seed Demo Data

```bash
cd backend
.venv\Scripts\Activate.ps1
python seed.py
```

Prints the demo student ID. Paste it in the browser console:
```js
localStorage.setItem('adt_student_id', '3')
```
Then refresh — the app loads "Alex Demo" with 5 courses and 4 pre-run scenarios.

### Run Tests

```bash
cd backend
python -m pytest tests/ -v
```

85 tests, all passing.

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Landing page with feature overview and stats |
| **Login / Register** | `/login` | JWT-based authentication — create an account or sign in |
| **Dashboard** | `/dashboard` | Latest simulation with trend indicators vs previous run |
| **Profile** | `/profile` | Student profile, course enrollment, and Canvas LMS import |
| **Scenarios** | `/scenarios` | Run simulations, view history, manage results |
| **Scenario Detail** | `/scenarios/:id` | Full report: charts, weekly table, Monte Carlo bands, actual grade tracker, CSV export |
| **Compare** | `/compare` | Side-by-side overlay of two scenarios |
| **Optimizer** | `/optimizer` | Differential evolution schedule optimizer |
| **AI Chat** | `/advisor` | Claude-powered advisor — auto-loads your latest simulation as context |
| **Goal Targeting** | `/advisor/goal` | Find the schedule needed to hit a target GPA |
| **All Students** | `/advisor/multi` | PIN-protected multi-student burnout risk and GPA overview |

---

## Features

### Authentication
- **JWT-based register + login** at `/login` — bcrypt-hashed passwords, 7-day tokens
- Signed-in user name shown in the navbar with a logout button
- **Backward compatible** — seed/guest accounts accessed via student ID still work without a password
- Default admin PIN for the All Students view: `1234`

### Simulation Engine
- **5-subsystem tick loop** run once per simulated week: Time System → Cognitive Load → Retention → Performance → Recovery
- **Variable sleep schedule** — weekday 6.5h / weekend 9h average (50.5h/week) as an alternative to a fixed nightly target
- **Exam week modifiers** — cognitive load ×1.3, grade +5 if retention > 70%, grade −10 if burnout > 60%
- **Extracurricular hours** — deducted from the weekly 168h budget before study time is allocated
- **Mid-semester course drop** — freeze a course grade at a chosen week and remove it from ongoing load

### Monte Carlo Analysis
Run 200 randomized simulations with sleep jitter as the variance proxy. Produces **p10 / p50 / p90 GPA confidence bands** displayed as a shaded area on the GPA trajectory chart.

### AI Advisor (Claude)
Natural-language chat powered by `claude-haiku-4-5-20251001`.

- **Auto-context**: the latest simulation is automatically loaded — no manual selection needed
- **Rich context**: Claude receives weekly GPA and cognitive load trends (early vs late semester), worst burnout week, sleep deficit, and peak overload weeks — not just the summary
- Answers questions about burnout risk, study strategy, and schedule changes

Requires an Anthropic API key — see [AI Advisor Setup](#ai-advisor-setup).

### Goal Targeting
Grid search over study strategy × sleep hours × work hours to find the minimum schedule adjustments needed to achieve a target GPA. Returns recommended work hours, sleep, and strategy with actionable tips.

### Actual vs Predicted Tracking
Log real weekly grades per course during the semester. The scenario detail page overlays actual grades (red dashed line) on the predicted trajectory and shows a comparison table with Δ deviation.

### Intervention Timeline
The weekly snapshot table flags high-risk weeks automatically:
- `⚠ Reduce load` — cognitive load exceeded threshold
- `🔴 High burnout risk` — burnout probability > 60%

### CSV Export
Download the full week-by-week snapshot table as CSV — every metric, every course, ready for your own analysis.

### Multi-Student View
PIN-protected view (default PIN: `1234`) for advisors to monitor all student profiles sorted by burnout risk then GPA gap. Summary banner shows how many students are at HIGH risk and how many are on track for their target GPA.

### Canvas LMS Integration
Import enrolled courses directly from your institution's Canvas instance.

1. On the **Profile** page, click **Import from Canvas**
2. Enter your Canvas base URL (e.g. `https://yourschool.instructure.com`)
3. Paste a Canvas personal access token
4. Review, edit credits/difficulty, and import

Supports **paginated responses** — students with 50+ course histories get all their active enrollments, not just the first page.

**Getting a Canvas token:** Canvas → Account → Settings → Approved Integrations → New Access Token

> Your token is used only for the single fetch request and is **never stored**.

**Difficulty estimation by course level:**

| Level | Estimated difficulty |
|---|---|
| 100-level | 4.0 |
| 200-level | 5.0 |
| 300-level | 7.0 |
| 400-level | 8.0 |
| 500+ (graduate) | 9.0 |

Weekly workload defaults to **2 × credit hours** (Carnegie Unit standard). All values are editable before importing.

### Dark Mode
Toggle with the moon/sun icon in the navbar. Preference persisted in `localStorage` across sessions. System preference (`prefers-color-scheme`) is used on first visit.

---

## AI Advisor Setup

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Add a payment method and purchase credits (minimum $5)
3. Go to **Settings → API Keys → Create Key** and copy the key
4. Add it to `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

5. Restart the backend server

If the key is missing or invalid, the advisor page shows a clear error banner — all other features continue to work normally.

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for the full step-by-step guide.

**Summary:**
- **Backend** → Railway (`railway.toml` is pre-configured — push, set env vars, done)
- **Frontend** → Vercel (`vercel.json` is pre-configured — import from GitHub, set `NEXT_PUBLIC_API_URL`, done)

**Required production env vars:**

| Variable | Where | Value |
|----------|-------|-------|
| `ANTHROPIC_API_KEY` | Railway | Your Anthropic key |
| `CORS_ORIGINS` | Railway | `https://your-app.vercel.app` |
| `SECRET_KEY` | Railway | Random 32-char string (`python -c "import secrets; print(secrets.token_hex(32))"`) |
| `NEXT_PUBLIC_API_URL` | Vercel | `https://your-backend.railway.app` |

---

## Simulation Models

| Model | Description |
|-------|-------------|
| **Time System** | Distributes the 168h weekly budget across classes, work, sleep, study, recovery, and extracurriculars. During exam weeks, soft reserves are squeezed to fund extra study. Study is capped at 2× workload demand to allow A-range grades. |
| **Cognitive Load** | Computes mental effort from difficulty, study hours, prior fatigue, and sleep deficit. Applies a 1.3× multiplier on exam weeks. Normalizer scales with number of courses (n × 60). |
| **Retention Model** | Ebbinghaus forgetting curve with spaced repetition bonus. Tracks retention per course. |
| **Performance Model** | Sigmoid-based grade prediction (0–100%) from study ratio, cognitive load, retention, and exam week modifier. Study ratio of 2.0 → ~91% base score. |
| **Recovery & Burnout** | Logistic burnout probability from sustained overload and sleep deprivation. Burnout computed before grade prediction so exam modifiers are accurate. |
| **Optimizer** | `scipy.optimize.differential_evolution` over work hours, sleep, and study strategy. |
| **Monte Carlo** | 200 runs with ±0.15σ sleep jitter as variance proxy → p10/p50/p90 GPA bands. |

---

## Scenario Config Fields

| Field | Default | Description |
|-------|---------|-------------|
| `num_weeks` | 16 | Semester length (4–20 weeks) |
| `work_hours_per_week` | 0 | Weekly employment hours |
| `sleep_target_hours` | 7.0 | Nightly sleep target (used when `sleep_schedule = fixed`) |
| `sleep_schedule` | `fixed` | `fixed` (nightly target) or `variable` (6.5h weekday / 9h weekend) |
| `study_strategy` | `spaced` | `spaced` / `mixed` / `cramming` |
| `exam_weeks` | `[8, 16]` | Weeks with elevated load (midterms, finals) |
| `extracurricular_hours` | 0 | Weekly extracurricular commitment (0–20h) |
| `drop_course_id` | — | Course ID to drop mid-semester |
| `drop_at_week` | — | Week at which the course is dropped |
| `include_course_ids` | all | Subset of courses to include |
| `scenario_name` | — | Optional label for the simulation |

---

## Charts

| Chart | Used On |
|-------|---------|
| GPA Trajectory — predicted line + Monte Carlo p10/p90 band + actual grades overlay | Dashboard, Scenario Detail, Optimizer |
| Cognitive Load (line + fatigue overlay, exam week markers) | Dashboard, Scenario Detail |
| Burnout Risk Gauge (radial) | Dashboard, Scenario Detail |
| Time Allocation (pie) | Dashboard, Scenario Detail |
| Per-Course Grade Trajectories | Dashboard, Scenario Detail, Optimizer |
| Per-Course Knowledge Retention (area) | Scenario Detail |
| Knowledge Retention Heatmap (per-course × per-week) | Scenario Detail |
| GPA Across Scenarios (cross-run sparkline) | Dashboard (2+ runs) |
| GPA / Load / Burnout Comparison (overlaid lines) | Compare |
| Per-Course Grade Comparison (table) | Compare |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register a new account — returns JWT |
| POST | `/api/v1/auth/login` | Sign in with email + password — returns JWT |
| GET | `/api/v1/auth/me` | Validate a JWT and return student info |
| GET | `/api/v1/students/` | List all students |
| POST | `/api/v1/students/` | Create student profile |
| GET | `/api/v1/students/{id}` | Get student profile |
| PUT | `/api/v1/students/{id}` | Update profile |
| POST | `/api/v1/students/{id}/courses` | Add course |
| GET | `/api/v1/students/{id}/courses` | List courses |
| DELETE | `/api/v1/courses/{id}` | Remove course |
| POST | `/api/v1/simulations/run` | Run simulation |
| GET | `/api/v1/simulations/{id}` | Get result |
| GET | `/api/v1/simulations/student/{id}` | Simulation history |
| DELETE | `/api/v1/simulations/{id}` | Delete simulation |
| POST | `/api/v1/simulations/monte-carlo` | Run Monte Carlo (200 iterations) |
| POST | `/api/v1/simulations/{id}/actual-grades` | Save actual weekly grades |
| GET | `/api/v1/simulations/{id}/actual-grades` | Get actual grades |
| POST | `/api/v1/scenarios/optimize` | Run schedule optimizer |
| POST | `/api/v1/advisor/chat` | AI advisor chat (auto-loads latest sim context) |
| POST | `/api/v1/advisor/goal-target` | Goal targeting grid search |
| POST | `/api/v1/canvas/preview` | Fetch courses from Canvas LMS (paginated) |

---

## Tech Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic v2, numpy, scipy, httpx, anthropic, python-jose, passlib, pytest
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, Axios

---

## Troubleshooting

**"Cannot reach the backend"**
The backend server is not running or a stale process is blocking port 8000.

```powershell
# Kill stale processes on Windows
taskkill /F /IM python.exe

# Then restart
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

**"WinError 10013 — access permissions" on port 8000**

```powershell
netstat -ano | findstr :8000
taskkill /F /PID <pid>
```

**Frontend shows "Internal Service Error" or blank pages**
The `.next` build cache is stale. Clear it and restart:

```powershell
cd frontend
Remove-Item -Recurse -Force .next
npm run dev
# After first build, prevent future OneDrive corruption:
attrib +P .next /S /D
```

**Backend starts but frontend shows no data**
Make sure `NEXT_PUBLIC_API_URL` is set. Create `frontend/.env.local` if it doesn't exist:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Login returns "Invalid email or password"**
The seed student (`alex.demo@university.edu`) has no password — it was created before auth was added. Use the guest path: paste `localStorage.setItem('adt_student_id', '3')` in the browser console. To create a real account, go to `/login` → Register.

**AI advisor returns "Invalid API key"**
Re-copy your key from console.anthropic.com → Settings → API Keys. Make sure there are no spaces or line breaks in `backend/.env`.

**AI advisor returns "credit balance too low"**
Add credits at console.anthropic.com → Settings → Plans & Billing.

**Canvas import returns "Invalid Canvas token"**
Generate a new token: Canvas → Account → Settings → New Access Token. Copy the full token with no trailing spaces.

**Canvas import returns "No active courses found"**
Canvas only returns courses with `workflow_state = available`. Check that your current semester courses are published.

---

## License

MIT © 2026 Alex Chidera Umeasalugo
