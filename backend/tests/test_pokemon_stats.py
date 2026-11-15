def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_stats_uses_latest_month_and_ignores_case(client):
    response = client.get("/api/pokemon/great tusk/stats", params={"tier": "gen9ou"})
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Great Tusk"
    assert body["date"] == "2026-10"
    assert body["usage_percent"] == 32.0


def test_stats_for_an_explicit_month(client):
    response = client.get(
        "/api/pokemon/Great Tusk/stats", params={"tier": "gen9ou", "date": "2026-09"}
    )
    assert response.status_code == 200
    assert response.json()["usage_percent"] == 30.0


def test_stats_unknown_pokemon_returns_404(client):
    response = client.get("/api/pokemon/Missingno/stats", params={"tier": "gen9ou"})
    assert response.status_code == 404


def test_smogon_names_joins_the_latest_month_of_each_tier(client):
    response = client.get("/api/smogon/names")
    assert response.status_code == 200
    body = response.json()
    assert body["tiers"] == {"gen9ou": "2026-10", "gen9uu": "2026-10"}
    assert body["names"] == ["Dragapult", "Gholdengo", "Great Tusk", "Kingambit", "Pikachu"]
