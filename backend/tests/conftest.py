import os
import time

import jwt
import pytest

# app.core.config exige estas variáveis já na importação.
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-with-at-least-32-bytes")

from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402
from app.routers import pokemon_stats  # noqa: E402
from app.services import tier_model  # noqa: E402
from tests.fake_supabase import FakeSupabase, stats_row  # noqa: E402

ROWS = [
    stats_row("Great Tusk", "gen9ou", "2026-09", 30.0, {"Kingambit": 40.0, "Gholdengo": 20.0}),
    stats_row("Great Tusk", "gen9ou", "2026-10", 32.0, {"Kingambit": 45.0, "Gholdengo": 25.0}),
    stats_row("Kingambit", "gen9ou", "2026-10", 28.0, {"Great Tusk": 50.0, "Dragapult": 30.0}),
    stats_row("Gholdengo", "gen9ou", "2026-10", 26.0, {"Great Tusk": 35.0, "Dragapult": 20.0}),
    stats_row("Dragapult", "gen9ou", "2026-10", 24.0, {"Kingambit": 30.0, "Gholdengo": 30.0}),
    stats_row("Pikachu", "gen9uu", "2026-10", 5.0),
]


@pytest.fixture
def fake_db(monkeypatch):
    db = FakeSupabase(ROWS)
    monkeypatch.setattr(main, "supabase", db)
    monkeypatch.setattr(pokemon_stats, "_supabase", db)
    monkeypatch.setitem(pokemon_stats._names_cache, "value", None)
    monkeypatch.setattr(tier_model, "_cache", {})
    return db


@pytest.fixture
def client(fake_db):
    return TestClient(main.app)


@pytest.fixture
def auth_header():
    token = jwt.encode(
        {"sub": "test", "exp": int(time.time()) + 60},
        os.environ["SUPABASE_JWT_SECRET"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}
