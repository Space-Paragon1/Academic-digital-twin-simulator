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

    # ── Email (Resend — https://resend.com) ──────────────────────────────────
    # Railway blocks outbound SMTP (ports 587/465); Resend uses HTTPS (443).
    # Sign up free at resend.com → API Keys → Create Key
    RESEND_API_KEY: str | None = None
    # Sender address shown in the From field.
    # On the free plan without a custom domain use: onboarding@resend.dev
    RESEND_FROM: str = "Academic Digital Twin <onboarding@resend.dev>"

    # ── Frontend URL (used in password-reset links) ───────────────────────────
    FRONTEND_URL: str = "https://academic-digital-twin-simulator.vercel.app"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
