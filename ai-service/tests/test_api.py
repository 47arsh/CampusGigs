import importlib
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


class FakeService:
    def generate_answer(self, message):
        return {
            "answer": f"Echo: {message}",
            "sources": [{"source": "policy.md", "source_filename": "policy.md", "distance": 0.1}],
        }


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN", "test-token")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    import main

    importlib.reload(main)
    main.service = FakeService()

    with TestClient(main.app) as test_client:
        yield test_client


def test_health_is_public(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_requires_the_internal_token(client):
    response = client.post("/chat", json={"message": "How do I cancel?"})

    assert response.status_code == 401


def test_chat_rejects_an_incorrect_token(client):
    response = client.post(
        "/chat",
        json={"message": "How do I cancel?"},
        headers={"X-Internal-Token": "wrong-token"},
    )

    assert response.status_code == 401


def test_chat_returns_the_service_answer(client):
    response = client.post(
        "/chat",
        json={"message": "How do I cancel?"},
        headers={"X-Internal-Token": "test-token"},
    )

    assert response.status_code == 200
    assert response.json()["answer"] == "Echo: How do I cancel?"


def test_chat_rejects_an_empty_message(client):
    response = client.post(
        "/chat",
        json={"message": ""},
        headers={"X-Internal-Token": "test-token"},
    )

    assert response.status_code == 422


def test_chat_rejects_an_oversized_message(client):
    response = client.post(
        "/chat",
        json={"message": "a" * 2001},
        headers={"X-Internal-Token": "test-token"},
    )

    assert response.status_code == 422
