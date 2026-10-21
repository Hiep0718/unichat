"""Validated, redacted configuration for explicitly selected generation providers."""

from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

HIVE_MODEL: Literal["deepseek-ai/deepseek-v4.1-flash-1017"] = (
    "deepseek-ai/deepseek-v4.1-flash-1017"
)
HIVE_BASE_URL = "https://api-cdn.thehive.ai/api/v3"
ENV_FILES = (Path(__file__).resolve().parents[3] / ".env",
             Path(__file__).resolve().parents[2] / ".env")
HIVE_HOSTS = {"api.thehive.ai", "api-cdn.thehive.ai", "api-va1.thehive.ai"}


class ProviderSettings(BaseSettings):
    """Environment-only generation configuration; construction never calls a provider."""

    llm_provider: Literal["gemini", "hive"] = "gemini"
    hive_base_url: str = HIVE_BASE_URL
    hive_model: Literal["deepseek-ai/deepseek-v4.1-flash-1017"] = HIVE_MODEL
    hive_api_key: str = Field(default="", repr=False)
    hive_api_key_2: str = Field(default="", repr=False)
    hive_api_key_secondary: str = Field(default="", repr=False)
    hive_api_keys: str = Field(default="", repr=False)
    gemini_api_key: str = Field(default="", repr=False)
    gemini_api_key_2: str = Field(default="", repr=False)
    gemini_api_key_secondary: str = Field(default="", repr=False)
    gemini_api_keys: str = Field(default="", repr=False)
    gemini_model: str = Field(default="gemini-3.5-flash", pattern=r"^gemini-[a-zA-Z0-9._-]+$")
    hive_max_tokens: int = Field(default=4096, ge=1, le=4096)
    hive_temperature: float = Field(default=0.2, ge=0, le=2)
    hive_top_p: float = Field(default=0.9, ge=0, le=1)
    hive_reasoning_effort: Literal["none", "low", "high", "max"] = "low"
    hive_read_idle_timeout_seconds: float = Field(
        default=5, gt=0, le=5,
        validation_alias=AliasChoices(
            "HIVE_READ_IDLE_TIMEOUT_SECONDS", "HIVE_READ_TIMEOUT_SECONDS"
        ),
    )

    model_config = SettingsConfigDict(
        extra="ignore", env_file=ENV_FILES, env_ignore_empty=False, hide_input_in_errors=True,
    )

    @model_validator(mode="after")
    def validate_hive(self) -> "ProviderSettings":
        """Allow only the approved HTTPS endpoint and require selected Hive credentials."""
        endpoint = urlsplit(self.hive_base_url)
        if (endpoint.scheme != "https" or endpoint.netloc not in HIVE_HOSTS
                or endpoint.path.rstrip("/") != "/api/v3" or endpoint.query or endpoint.fragment):
            raise ValueError("HIVE_BASE_URL_INVALID")
        credentials = [
            self.hive_api_key,
            self.hive_api_key_2,
            self.hive_api_key_secondary,
            *self.hive_api_keys.split(","),
        ]
        if self.llm_provider == "hive" and not any(value.strip() for value in credentials):
            raise ValueError("HIVE_CREDENTIALS_REQUIRED")
        return self
