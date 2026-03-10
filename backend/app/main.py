from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import get_settings
from app.db.database import Base, engine
from app.api.routes import students, courses, simulations, scenarios, canvas, advisor, auth

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup, then apply any missing column migrations."""
    Base.metadata.create_all(bind=engine)
    # Idempotent column migrations — safe to run on every startup
    try:
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"
            ))
            conn.commit()
    except Exception:
        pass  # Column already exists or SQLite (no IF NOT EXISTS needed)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="A simulation engine that models a student as a dynamic system, predicting GPA, cognitive load, burnout risk, and optimal schedules.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(students.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(simulations.router, prefix="/api/v1")
app.include_router(scenarios.router, prefix="/api/v1")
app.include_router(canvas.router, prefix="/api/v1")
app.include_router(advisor.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all: return 500 JSON with CORS headers so the browser never sees a blocked response."""
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )


@app.get("/health", tags=["health"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": settings.APP_NAME, "version": "sha256-auth-v1"}
