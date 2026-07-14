"""Health endpoint integration tests."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_should_return_ok_when_service_is_available() -> None:
    """Verify the stable private health response."""
    # Arrange
    client = TestClient(app)

    # Act
    response = client.get("/internal/v1/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ai-service"}