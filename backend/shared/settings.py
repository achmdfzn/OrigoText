from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, sourced from the environment only.

    Secrets are never defaulted: an unset `api_keys` in a non-development
    environment fails startup rather than silently exposing the API.
    """

    model_config = SettingsConfigDict(
        env_prefix="ORIGOTEXT_",
        env_file=".env",
        extra="ignore",
    )

    environment: str = "development"
    api_keys: str = ""
    database_url: str = ""
    migration_database_url: str = ""
    allowed_origins: str = "http://localhost:3000"
    rate_limit_per_minute: int = Field(default=30, ge=1)
    upload_rate_limit_per_minute: int = Field(default=10, ge=1)

    @field_validator("environment")
    @classmethod
    def _normalize_environment(cls, value: str) -> str:
        normalized = value.strip().lower()
        allowed = {"development", "staging", "production"}
        if normalized not in allowed:
            raise ValueError(f"environment must be one of {sorted(allowed)}")
        return normalized

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def has_database(self) -> bool:
        """Whether durable storage is configured.

        Without a database URL the app falls back to in-memory adapters, so
        local development needs no external service.
        """
        return bool(self.database_url.strip())

    @property
    def parsed_api_keys(self) -> frozenset[str]:
        return frozenset(key.strip() for key in self.api_keys.split(",") if key.strip())

    @property
    def parsed_allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    def require_valid_configuration(self) -> None:
        if not self.is_development and not self.parsed_api_keys:
            raise RuntimeError(
                f"ORIGOTEXT_API_KEYS must be set in the '{self.environment}' environment."
            )
        weak = {key for key in self.parsed_api_keys if len(key) < 32}
        if weak and not self.is_development:
            raise RuntimeError("Every API key must be at least 32 characters long.")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
