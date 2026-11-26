"""Quem pode chamar as rotas protegidas e os limites de requisição."""

import time

import pytest

from app import main
from app.core.rate_limit import RateLimiter
from tests.conftest import bearer, make_token

RECOMMEND = {"team": ["Great Tusk"], "tier": "gen9ou"}


@pytest.mark.parametrize(
    "claims",
    [
        {},  # sem aud nem role (como o token antigo do workflow)
        {"aud": "authenticated"},  # sem role
        {"aud": "authenticated", "role": "anon"},  # chave anônima legada
        {"aud": "authenticated", "role": "service_role"},
        {"role": "authenticated"},  # sem aud
        {"aud": "authenticated", "role": "authenticated", "exp": None},  # sem validade
    ],
)
def test_recommend_rejects_tokens_that_are_not_user_sessions(client, claims):
    response = client.post("/api/recommend", json=RECOMMEND, headers=bearer(make_token(**claims)))
    assert response.status_code == 401


def test_recommend_rejects_a_token_signed_with_another_secret(client):
    import jwt

    token = jwt.encode(
        {"sub": "x", "aud": "authenticated", "role": "authenticated", "exp": int(time.time()) + 60},
        "outro-segredo-com-pelo-menos-32-bytes!!",
        algorithm="HS256",
    )
    assert client.post("/api/recommend", json=RECOMMEND, headers=bearer(token)).status_code == 401


def test_sync_rejects_user_sessions(client, auth_header, monkeypatch):
    monkeypatch.setattr(main, "run_sync", lambda: pytest.fail("não deveria sincronizar"))
    assert client.post("/api/admin/sync-smogon", headers=auth_header).status_code == 403
    assert client.post("/api/admin/sync-smogon").status_code == 401


def test_sync_accepts_the_workflow_token_and_runs_one_at_a_time(client, monkeypatch):
    calls = []
    monkeypatch.setattr(main, "run_sync", lambda: calls.append(1))
    headers = bearer(make_token(sub="github-actions-smogon-sync", role="smogon-sync"))

    # Com a trava presa (sincronização em andamento), a segunda chamada recebe 409.
    assert main._sync_lock.acquire(blocking=False)
    try:
        assert client.post("/api/admin/sync-smogon", headers=headers).status_code == 409
    finally:
        main._sync_lock.release()

    assert client.post("/api/admin/sync-smogon", headers=headers).status_code == 200
    assert calls == [1]
    assert not main._sync_lock.locked()


def test_sync_releases_the_lock_when_the_scraper_fails(client, monkeypatch):
    def boom():
        raise RuntimeError("smogon fora do ar")

    monkeypatch.setattr(main, "run_sync", boom)
    headers = bearer(make_token(sub="github-actions-smogon-sync", role="smogon-sync"))
    assert client.post("/api/admin/sync-smogon", headers=headers).status_code == 200
    assert not main._sync_lock.locked()


def test_recommend_hides_internal_errors(client, auth_header, monkeypatch):
    async def broken(*_args):
        raise RuntimeError("senha=segredo em /etc/app")

    monkeypatch.setattr(main, "build_recommendation", broken)
    response = client.post("/api/recommend", json=RECOMMEND, headers=auth_header)
    assert response.status_code == 500
    assert "segredo" not in response.text


def test_rate_limiter_window():
    now = [0.0]
    limiter = RateLimiter(limit=2, window_s=10, clock=lambda: now[0])
    assert limiter.hit("a") is None
    assert limiter.hit("a") is None
    assert limiter.hit("a") == 10
    assert limiter.hit("b") is None  # cada chave tem o seu limite
    now[0] = 10.5
    assert limiter.hit("a") is None


def test_public_routes_return_429_with_retry_after(client, monkeypatch):
    from app.core import rate_limit

    monkeypatch.setattr(rate_limit.public_limiter, "limit", 2)
    statuses = [client.get("/api/smogon/names").status_code for _ in range(3)]
    assert statuses == [200, 200, 429]
    response = client.get("/api/smogon/names")
    assert response.headers["retry-after"].isdigit()


def test_client_ip_uses_the_last_forwarded_hop():
    from starlette.requests import Request

    from app.core.rate_limit import client_ip

    scope = {"type": "http", "headers": [(b"x-forwarded-for", b"1.1.1.1, 9.9.9.9")], "client": ("10.0.0.1", 1)}
    assert client_ip(Request(scope)) == "9.9.9.9"
