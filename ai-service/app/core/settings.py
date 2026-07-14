"""Validated environment settings for the AI Service."""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-only AI Service configuration."""

    project_name: str = "UniChat AI Service"
    api_v1_prefix: str = "/internal/v1"
    app_environment: Literal["local", "test", "staging", "production"] = Field(
        default="local",
        validation_alias="APP_ENV",
    )
    frontend_origin: AnyHttpUrl = Field(
        default=AnyHttpUrl("http://localhost:5173"),
        validation_alias="FRONTEND_ORIGIN",
    )
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        """Return whether production-only safeguards should be active."""
        return self.app_environment == "production"


@lru_cache
def get_settings() -> Settings:
    """Return the cached validated settings instance."""
    return Settings()