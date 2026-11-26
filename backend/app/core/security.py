"""Autenticação das rotas protegidas.

Dois tipos de token, que não se substituem:

- **Usuário** (``verify_supabase_token``): o access token de uma sessão do Supabase Auth. Precisa ter
  ``aud`` e ``role`` iguais a ``authenticated``; assim a chave anônima, a service role e tokens sem papel
  não entram. Aceita a assinatura antiga (HS256 com o JWT secret) e as chaves de assinatura novas do
  Supabase (ES256/RS256), validadas pelo JWKS público do projeto.
- **Sincronização** (``verify_sync_token``): gerado pelo workflow smogon-sync.yml, HS256 com o JWT secret e
  ``role`` igual a ``smogon-sync``. Uma conta de usuário comum não consegue um token desses, então o cadastro
  aberto não dá acesso ao scraper.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, PyJWKClientError

from app.core.config import SUPABASE_JWT_SECRET, SUPABASE_URL

USER_ROLE = "authenticated"
SYNC_ROLE = "smogon-sync"
ASYMMETRIC_ALGORITHMS = ["ES256", "RS256"]
# Toda assinatura precisa de validade: um token sem exp valeria para sempre.
REQUIRED_CLAIMS = ["exp", "sub", "role"]

security = HTTPBearer(auto_error=False)
# As chaves públicas ficam em cache no cliente (lifespan padrão de 5 minutos).
_jwks_client = PyJWKClient(f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json", cache_keys=True)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _bearer(credentials: HTTPAuthorizationCredentials | None) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Token de autenticação não fornecido. Use: Authorization: Bearer <token>")
    return credentials.credentials


def _decode(token: str, *, allow_asymmetric: bool, audience: str | None) -> dict:
    try:
        algorithm = jwt.get_unverified_header(token).get("alg")
        if algorithm == "HS256":
            key, algorithms = SUPABASE_JWT_SECRET, ["HS256"]
        elif allow_asymmetric and algorithm in ASYMMETRIC_ALGORITHMS:
            key, algorithms = _jwks_client.get_signing_key_from_jwt(token).key, ASYMMETRIC_ALGORITHMS
        else:
            raise _unauthorized("Token inválido")
        return jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience=audience,
            options={"require": REQUIRED_CLAIMS, "verify_aud": audience is not None},
        )
    except ExpiredSignatureError:
        raise _unauthorized("Token expirado")
    except (InvalidTokenError, PyJWKClientError):
        raise _unauthorized("Token inválido")


def verify_supabase_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Sessão de um usuário logado no Supabase."""
    payload = _decode(_bearer(credentials), allow_asymmetric=True, audience=USER_ROLE)
    if payload.get("role") != USER_ROLE:
        raise _unauthorized("Token inválido")
    return payload


def verify_sync_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Token do workflow de sincronização da Smogon; tokens de usuário são recusados."""
    payload = _decode(_bearer(credentials), allow_asymmetric=False, audience=None)
    if payload.get("role") != SYNC_ROLE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito à sincronização automática")
    return payload
