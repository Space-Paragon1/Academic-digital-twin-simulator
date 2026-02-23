# Academic Digital Twin Simulator

> A simulation engine that models a student as a dynamic system and predicts GPA, burnout risk, cognitive load, and optimal schedules under different academic workload scenarios.

## Architecture

```
Academic-digital-twin-simulator/
├── backend/          Python · FastAPI · SQLAlchemy · numpy/scipy
└── frontend/         Next.js 15 · TypeScript · Tailwind CSS · Recharts
```

```
                    ┌──────────────────────────────┐
                    │        Next.js Frontend        │
                    │  Dashboard · Scenarios · Optimizer │
                    └────────────┬─────────────────┘
                                 │  REST API
                    ┌────────────▼─────────────────┐
                    │       FastAPI Backend          │
                    │   /api/v1/students             │
                    │   /api/v1/courses              │
                    │   /api/v1/simulations          │
                    │   /api/v1/scenarios/optimize   │
                    └────────────┬─────────────────┘
                                 │
                    ┌────────────▼─────────────────┐
                    │     Simulation Engine          │
                    │  ┌──────────┐ ┌─────────────┐ │
                    │  │ TimeSystem│ │CognitiveLoad│ │
                    │  └──────────┘ └─────────────┘ │
                    │  ┌──────────┐ ┌─────────────┐ │
                    │  │Retention │ │ Performance │ │
                    │  └──────────┘ └─────────────┘ │
                    │  ┌──────────┐ ┌─────────────┐ │
                    │  │ Recovery │ │  Optimizer  │ │
                    │  └──────────┘ └─────────────┘ │
                    └────────────┬─────────────────┘
                                 │
                    ┌────────────▼─────────────────┐
                    │       SQLite Database           │
                    │  students · courses · runs     │
                    └──────────────────────────────┘
```

## Quick Start

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

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

### Run Tests

```bash
cd backend
pytest tests/ -v
```

## Simulation Models

| Model | Description |
|-------|-------------|
| **Time System** | Distributes the 168-hour weekly budget across classes, work, sleep, study, recovery, and social time |
| **Cognitive Load** | Computes mental effort from difficulty, study hours, prior fatigue, and sleep deficit |
| **Retention Model** | Applies Ebbinghaus forgetting curve with spaced repetition bonus |
| **Performance Model** | Sigmoid-based grade prediction from study time, cognitive load, and retention |
| **Recovery & Burnout** | Logistic burnout probability from sustained overload and sleep deprivation |
| **Optimizer** | scipy differential evolution over work hours, sleep, and study strategy |

## Example Scenario Output

```
Simulation Result (16 weeks, 10h/week work, spaced study)

Predicted GPA:    3.72 – 3.89
Burnout Risk:     MEDIUM
Peak Load Weeks:  6, 7, 8
Required Study:   23.5 h/week
Sleep Deficit:    2.1 h/week

Recommendation:
  Moderate burnout risk detected — watch weeks 6, 7, 8.
  Consider increasing recovery time during midterms.
```

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
| POST | `/api/v1/scenarios/optimize` | Run optimizer |

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, numpy, scipy, pytest
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, Axios

## License

MIT © 2026 Alex Chidera Umeasalugo
