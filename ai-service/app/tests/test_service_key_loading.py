"""Isolated tests for service-key configuration loading."""

from pathlib import Path

import pytest

from app.core import provider_settings
from app.core.service_security import ServiceSecurityError, configured_key

KEY_NAME = "TEST_SERVICE_PUBLIC_KEY"
KEY_PATH_NAME = f"{KEY_NAME}_PATH"


@pytest.fixture(autouse=True)
def isolate_service_key_configuration(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Keep tests independent from developer service keys and workspace dotenv files."""
    monkeypatch.delenv(KEY_NAME, raising=False)
    monkeypatch.delenv(KEY_PATH_NAME, raising=False)
    monkeypatch.setattr(provider_settings, "ENV_FILES", (tmp_path / "missing.env",))


def test_should_prefer_inline_environment_value_over_file_sources(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    environment_key_path = tmp_path / "environment.pem"
    environment_key_path.write_text("environment-path-key", encoding="utf-8")
    dotenv_path = write_dotenv(tmp_path, f"{KEY_NAME}=dotenv-key")
    monkeypatch.setattr(provider_settings, "ENV_FILES", (dotenv_path,))
    monkeypatch.setenv(KEY_PATH_NAME, str(environment_key_path))
    monkeypatch.setenv(KEY_NAME, "inline\\nkey")

    loaded_key = configured_key(KEY_NAME)

    assert loaded_key == "inline\nkey"


def test_should_prefer_environment_path_over_dotenv_value(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    environment_key_path = tmp_path / "environment.pem"
    environment_key_path.write_text("environment-path-key", encoding="utf-8")
    dotenv_path = write_dotenv(tmp_path, f"{KEY_NAME}=dotenv-key")
    monkeypatch.setattr(provider_settings, "ENV_FILES", (dotenv_path,))
    monkeypatch.setenv(KEY_PATH_NAME, str(environment_key_path))

    loaded_key = configured_key(KEY_NAME)

    assert loaded_key == "environment-path-key"


def test_should_resolve_dotenv_key_path_relative_to_dotenv_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    configuration_directory = tmp_path / "configuration"
    key_path = configuration_directory / "keys" / "service-public.pem"
    key_path.parent.mkdir(parents=True)
    key_path.write_text("dotenv-relative-key", encoding="utf-8")
    dotenv_path = write_dotenv(
        configuration_directory, f"{KEY_PATH_NAME}=keys/service-public.pem"
    )
    unrelated_directory = tmp_path / "working-directory"
    unrelated_directory.mkdir()
    monkeypatch.chdir(unrelated_directory)
    monkeypatch.setattr(provider_settings, "ENV_FILES", (dotenv_path,))

    loaded_key = configured_key(KEY_NAME)

    assert loaded_key == "dotenv-relative-key"


def test_should_fail_safely_when_key_is_unconfigured() -> None:
    with pytest.raises(ServiceSecurityError, match="^SERVICE_KEY_UNCONFIGURED$"):
        configured_key(KEY_NAME)


def write_dotenv(directory: Path, content: str) -> Path:
    """Create an isolated dotenv fixture without reading workspace configuration."""
    directory.mkdir(parents=True, exist_ok=True)
    dotenv_path = directory / ".env"
    dotenv_path.write_text(f"{content}\n", encoding="utf-8")
    return dotenv_path
