"""Typed application errors for expected AI Service failures."""


class AppError(Exception):
    """Base expected error carrying a stable client-safe code."""

    def __init__(self, code: str, message: str, status_code: int) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code