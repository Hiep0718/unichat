"""Offline test isolation: credentials come only from fixtures and sockets stay local."""

import socket
import sys
from typing import Any

import pytest

from app.core.provider_settings import ProviderSettings


@pytest.fixture(autouse=True)
def isolate_provider_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    """Never load live provider credentials or allow outbound test connections."""
    monkeypatch.setitem(ProviderSettings.model_config, "env_file", None)
    for name in ("LLM_PROVIDER", "HIVE_API_KEY", "HIVE_API_KEY_2", "HIVE_API_KEY_SECONDARY",
                 "HIVE_API_KEYS", "GEMINI_API_KEY", "GEMINI_API_KEY_2",
                 "GEMINI_API_KEY_SECONDARY", "GEMINI_API_KEYS", "ENABLE_OLLAMA_FALLBACK"):
        monkeypatch.delenv(name, raising=False)

    original_connect = socket.socket.connect

    def local_connection(connection: socket.socket, address: Any) -> None:
        caller = sys._getframe(1)
        is_socketpair = (caller.f_globals.get("__name__") == "socket"
                         and caller.f_code.co_name == "_fallback_socketpair")
        if (is_socketpair and isinstance(address, tuple)
                and address[0] in ("127.0.0.1", "::1", "localhost")):
            return original_connect(connection, address)
        raise AssertionError("Tests must mock external network connections")

    def local_connection_ex(connection: socket.socket, address: Any) -> int:
        raise AssertionError("Tests must mock external network connections")

    monkeypatch.setattr(socket.socket, "connect", local_connection)
    monkeypatch.setattr(socket.socket, "connect_ex", local_connection_ex)
