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

    # RabbitMQ — supports amqp:// (local) and amqps:// (CloudAMQP)
    rabbitmq_url: str = Field(
        default="amqp://guest:guest@localhost:5672",
        validation_alias="RABBITMQ_URL",
    )

    # Storage provider — 'local' reads from disk, 'supabase' reads from cloud
    storage_provider: str = Field(
        default="local",
        validation_alias="STORAGE_PROVIDER",
    )
    storage_dir: str = Field(
        default="../data/storage",
        validation_alias="STORAGE_DIR",
    )

    # Supabase Storage — used when storage_provider='supabase'
    supabase_storage_url: str = Field(
        default="",
        validation_alias="SUPABASE_STORAGE_URL",
    )
    supabase_service_key: str = Field(
        default="",
        validation_alias="SUPABASE_SERVICE_KEY",
    )
    supabase_storage_bucket: str = Field(
        default="documents",
        validation_alias="SUPABASE_STORAGE_BUCKET",
    )

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