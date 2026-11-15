import pytest

from app.services import recommendation_service, tier_model
from tests.fake_supabase import stats_row


@pytest.fixture
def offline_pokeapi(monkeypatch):
    async def type_system(_client):
        return ["ground", "dark", "steel"]

    async def pokemon_data(names):
        return {
            name: {"types": ["Ground"], "base_stats": {}, "sprite_url": None, "pokeapi_error": None}
            for name in names
        }

    monkeypatch.setattr(recommendation_service, "initialize_type_system", type_system)
    monkeypatch.setattr(recommendation_service, "fetch_many_pokemon_data", pokemon_data)
    monkeypatch.setattr(
        recommendation_service,
        "analyze_team_damage_profile",
        lambda _data, _types: {"missing": []},
    )


def test_tier_model_only_reads_the_latest_month(fake_db):
    model = tier_model.load_tier_model(fake_db, "gen9ou")
    assert model.date == "2026-10"
    assert model.usage_map["Great Tusk"] == 32.0
    assert model.by_usage[0] == "Great Tusk"


def test_tier_model_is_cached_until_a_new_month_arrives(fake_db):
    first = tier_model.load_tier_model(fake_db, "gen9ou")
    queries = fake_db.executed

    assert tier_model.load_tier_model(fake_db, "gen9ou") is first
    # Só a consulta da data mais recente roda de novo.
    assert fake_db.executed == queries + 1

    fake_db.rows.append({**stats_row("Great Tusk", "gen9ou", "2026-11", 40.0), "name_key": "great tusk"})
    refreshed = tier_model.load_tier_model(fake_db, "gen9ou")
    assert refreshed.date == "2026-11"
    assert list(tier_model._cache) == [("gen9ou", "2026-11")]


def test_tier_model_unknown_tier(fake_db):
    with pytest.raises(ValueError):
        tier_model.load_tier_model(fake_db, "gen9zu")


def test_recommend_requires_a_token(client):
    response = client.post("/api/recommend", json={"team": ["Great Tusk"], "tier": "gen9ou"})
    assert response.status_code == 401


def test_recommend_suggests_teammates_outside_the_team(client, auth_header, offline_pokeapi):
    response = client.post(
        "/api/recommend",
        json={"team": ["Great Tusk", "Kingambit"], "tier": "gen9ou", "limit": 2},
        headers=auth_header,
    )
    assert response.status_code == 200
    body = response.json()
    suggested = [body["recommended"]["name"], *(alt["name"] for alt in body["alternatives"])]
    assert suggested
    assert not {"Great Tusk", "Kingambit"} & set(suggested)


def test_recommend_unknown_tier_returns_404(client, auth_header, offline_pokeapi):
    response = client.post(
        "/api/recommend",
        json={"team": ["Great Tusk"], "tier": "gen9zu"},
        headers=auth_header,
    )
    assert response.status_code == 404
