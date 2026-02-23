from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    APP_NAME: str = "Academic Digital Twin"
    DATABASE_URL: str = "sqlite:///./academic_twin.db"
    DEBUG: bool = True
    # Stored as a comma-separated string so pydantic-settings never tries to
    # JSON-decode it. Parse into a list with the `cors_origins` property.
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
