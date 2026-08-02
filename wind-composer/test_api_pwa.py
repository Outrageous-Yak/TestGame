"""API tests for PWA backend (no microphone)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_health() -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_session_lifecycle() -> None:
    r = client.post("/api/session")
    assert r.status_code == 200
    sid = r.json()["session_id"]

    r = client.post(f"/api/session/{sid}/tick", json={"mic_energy": 0.3, "gust": False, "sample_delta": 4096})
    assert r.status_code == 200
    data = r.json()
    assert "plan" in data
    assert "orchestration" in data
    assert data["plan"]["tempo_bpm"] > 0

    r = client.get(f"/api/session/{sid}/settings")
    assert r.status_code == 200

    r = client.delete(f"/api/session/{sid}")
    assert r.status_code == 200


def test_weather_search() -> None:
    r = client.post("/api/session")
    sid = r.json()["session_id"]
    r = client.post(f"/api/session/{sid}/weather/search", json={"query": "London"})
    assert r.status_code == 200
    results = r.json()
    assert isinstance(results, list)


if __name__ == "__main__":
    test_health()
    test_session_lifecycle()
    test_weather_search()
    print("PWA API tests passed")
