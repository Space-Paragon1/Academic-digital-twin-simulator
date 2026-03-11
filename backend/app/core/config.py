from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Academic Digital Twin"
    # Local dev default: SQLite. Production: set DATABASE_URL to a PostgreSQL URL.
    # e.g. postgresql://user:password@host:5432/dbname
    DATABASE_URL: str = "sqlite:///./academic_twin.db"
    DEBUG: bool = True
    # Stored as a comma-separated string so pydantic-settings never tries to
    # JSON-decode it. Parse into a list with the `cors_origins` property.
    CORS_ORIGINS: str = "http://localhost:3000,https://academic-digital-twin-simulator.vercel.app"
    ANTHROPIC_API_KEY: str | None = None
    # Used to sign JWT tokens. Override in production with a long random string.
    SECRET_KEY: str = "dev-secret-change-in-production"

    # ── Email (Gmail SMTP) ────────────────────────────────────────────────────
    # SMTP_USER  = your Gmail address, e.g. you@gmail.com
    # SMTP_PASSWORD = 16-char App Password from Google Account → Security → App Passwords
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None

    # ── Frontend URL (used in password-reset links) ───────────────────────────
    FRONTEND_URL: str = "https://academic-digital-twin-simulator.vercel.app"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
