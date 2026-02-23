from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.database import Base, engine
from app.api.routes import students, courses, simulations, scenarios

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup."""
    Base.metadata.create_all(bind=engine)
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


@app.get("/health", tags=["health"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": settings.APP_NAME}
