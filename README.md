# Academic Digital Twin Simulator

> A simulation engine that models a student as a dynamic system and predicts GPA, burnout risk, cognitive load, and optimal schedules under different academic workload scenarios. Courses can be imported directly from Canvas LMS.

## Architecture

```
Academic-digital-twin-simulator/
├── backend/          Python · FastAPI · SQLAlchemy · numpy/scipy
└── frontend/         Next.js 15 · TypeScript · Tailwind CSS · Recharts
```

```
                    ┌──────────────────────────────────────┐
                    │           Next.js Frontend            │
                    │  Dashboard · Scenarios · Compare      │
                    │  Optimizer · Profile                  │
                    └────────────┬─────────────────────────┘
                                 │  REST API
                    ┌────────────▼─────────────────────────┐
                    │         FastAPI Backend               │
                    │   /api/v1/students                    │
                    │   /api/v1/courses                     │
                    │   /api/v1/simulations                 │
                    │   /api/v1/scenarios/optimize          │
                    │   /api/v1/canvas/preview              │
                    └────────────┬─────────────────────────┘
                                 │
                    ┌────────────▼─────────────────────────┐
                    │       Simulation Engine               │
                    │  ┌──────────┐  ┌──────────────────┐  │
                    │  │TimeSystem│  │ CognitiveLoad     │  │
                    │  └──────────┘  └──────────────────┘  │
                    │  ┌──────────┐  ┌──────────────────┐  │
                    │  │Retention │  │ Performance       │  │
                    │  └──────────┘  └──────────────────┘  │
                    │  ┌──────────┐  ┌──────────────────┐  │
                    │  │Recovery  │  │ Optimizer         │  │
                    │  └──────────┘  └──────────────────┘  │
                    └────────────┬─────────────────────────┘
                                 │
                    ┌────────────▼─────────────────────────┐
                    │          SQLite Database              │
                    │   students · courses · runs           │
                    └──────────────────────────────────────┘
```

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

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment config
cp .env.local.example .env.local

# Start the dev server
npm run dev
```

Open: `http://localhost:3000`

> **Both servers must be running simultaneously.** Keep each in its own terminal.

### Run Tests

```bash
cd backend
python -m pytest tests/ -v
# 72 tests across 7 suites: API, engine, cognitive load, performance, recovery, retention, time system
```

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/dashboard` | Latest simulation with trend indicators vs previous run |
| **Profile** | `/profile` | Student profile, course enrollment, and Canvas LMS import |
| **Scenarios** | `/scenarios` | Run simulations, view history, manage results |
| **Scenario Detail** | `/scenarios/:id` | Full report with charts, weekly table, and CSV export |
| **Compare** | `/compare` | Side-by-side overlay of two scenarios |
| **Optimizer** | `/optimizer` | Differential evolution schedule optimizer |

---

## Canvas LMS Integration

Import your real enrolled courses directly from your institution's Canvas instance — no manual entry needed.

**How it works:**

1. On the **Profile** page, click **Import from Canvas**
2. Enter your institution's Canvas base URL (e.g. `https://yourschool.instructure.com`)
3. Paste a Canvas personal access token
4. Review the fetched courses — credits, difficulty, and workload are pre-estimated and fully editable
5. Select courses to import and confirm

**Getting a Canvas access token:**

Canvas → **Account** → **Settings** → scroll to **Approved Integrations** → **New Access Token**

> Your token is used only for the single fetch request and is **never stored** by the application.

**Difficulty estimation from course code:**

| Course level | Estimated difficulty |
|---|---|
| 100-level | 4.0 |
| 200-level | 5.0 |
| 300-level | 7.0 |
| 400-level | 8.0 |
| 500+ (graduate) | 9.0 |

Weekly workload defaults to **2 × credit hours** (Carnegie Unit standard). All values are editable before importing.

---

## Simulation Models

| Model | Description |
|-------|-------------|
| **Time System** | Distributes the 168-hour weekly budget across classes, work, sleep, study, recovery, and social time. During exam weeks, soft reserves (recovery/social) are squeezed to fund extra study. |
| **Cognitive Load** | Computes mental effort from difficulty, study hours, prior fatigue, and sleep deficit. Applies a 1.3× multiplier on designated exam weeks. |
| **Retention Model** | Ebbinghaus forgetting curve with spaced repetition bonus. Tracks retention per course. |
| **Performance Model** | Sigmoid-based grade prediction (0–100%) from study time, cognitive load, and retention. |
| **Recovery & Burnout** | Logistic burnout probability from sustained overload and sleep deprivation. |
| **Optimizer** | scipy differential evolution over work hours, sleep, and study strategy (3 objectives). |

---

## Scenario Config Fields

| Field | Default | Description |
|-------|---------|-------------|
| `num_weeks` | 16 | Semester length (4–20 weeks) |
| `work_hours_per_week` | 0 | Weekly employment hours |
| `sleep_target_hours` | 7.0 | Nightly sleep target |
| `study_strategy` | `spaced` | `spaced` / `mixed` / `cramming` |
| `exam_weeks` | `[8, 16]` | Weeks with elevated load (midterms, finals) |
| `include_course_ids` | all | Subset of courses to include |
| `scenario_name` | — | Optional label for the simulation |

---

## Charts

| Chart | Used On |
|-------|---------|
| GPA Trajectory (area + confidence band, exam week markers) | Dashboard, Scenario Detail, Optimizer |
| Cognitive Load (line + fatigue overlay, exam week markers) | Dashboard, Scenario Detail |
| Burnout Risk Gauge (radial) | Dashboard, Scenario Detail |
| Time Allocation (pie) | Dashboard, Scenario Detail |
| Per-Course Grade Trajectories | Dashboard, Scenario Detail, Optimizer |
| Per-Course Knowledge Retention (area) | Scenario Detail |
| Knowledge Retention Heatmap (per-course × per-week color grid) | Scenario Detail |
| GPA Across Scenarios (cross-run sparkline) | Dashboard (2+ runs) |
| GPA / Load / Burnout Comparison (overlaid lines) | Compare |
| Per-Course Grade Comparison (table) | Compare |

---

## Example Scenario Output

```
Simulation Result (16 weeks, 10h/week work, spaced study, exam weeks 8 & 16)

Predicted GPA:    3.72 – 3.89
Burnout Risk:     MEDIUM
Peak Load Weeks:  6, 7, 8, 16
Required Study:   23.5 h/week
Sleep Deficit:    2.1 h/week

Recommendation:
  Moderate burnout risk detected — watch weeks 6, 7, 8.
  Consider increasing recovery time during midterms.
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
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
| POST | `/api/v1/scenarios/optimize` | Run optimizer |
| POST | `/api/v1/canvas/preview` | Fetch courses from Canvas LMS |

---

## Tech Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic v2, numpy, scipy, httpx, pytest
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
Another process is already listening on port 8000. Find and kill it:

```powershell
netstat -ano | findstr :8000
taskkill /F /PID <pid>
```

**Backend starts but frontend shows no data**
Make sure `frontend/.env.local` exists and contains:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Canvas import returns "Invalid Canvas token"**
Generate a new token at: Canvas → Account → Settings → New Access Token.
Make sure you copy the full token string with no trailing spaces.

**Canvas import returns "No active courses found"**
Canvas only returns courses with `workflow_state = available`. Concluded or unpublished courses are excluded. Check that your current semester courses are published by your instructor.

---

## License

MIT © 2026 Alex Chidera Umeasalugo
