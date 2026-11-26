"""Limite de requisições por janela deslizante, em memória.

O backend roda num processo só (Render), então um contador local basta; com mais de um processo cada um teria
o seu limite. A chave é o usuário (``sub`` do token) nas rotas autenticadas e o IP nas públicas.
"""

import threading
import time
from collections import deque
from typing import Callable, Deque, Dict

from fastapi import Depends, HTTPException, Request, status

from app.core.security import verify_supabase_token


class RateLimiter:
    def __init__(self, limit: int, window_s: float, clock: Callable[[], float] = time.monotonic):
        self.limit = limit
        self.window_s = window_s
        self._clock = clock
        self._hits: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()
        self._next_sweep = 0.0

    def hit(self, key: str) -> float | None:
        """Registra uma requisição; devolve None se cabe no limite, ou os segundos até liberar."""
        now = self._clock()
        with self._lock:
            self._sweep(now)
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= now - self.window_s:
                hits.popleft()
            if len(hits) >= self.limit:
                return max(1.0, hits[0] + self.window_s - now)
            hits.append(now)
            return None

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def _sweep(self, now: float) -> None:
        # Tira as chaves sem requisição recente, para a memória não crescer com IPs que só passaram uma vez.
        if now < self._next_sweep:
            return
        self._next_sweep = now + self.window_s
        for key in [key for key, hits in self._hits.items() if not hits or hits[-1] <= now - self.window_s]:
            del self._hits[key]


def client_ip(request: Request) -> str:
    """IP de quem chamou. Atrás do proxy do Render, é o último item do X-Forwarded-For (o que o proxy viu);
    os anteriores vêm do próprio cliente e podem ser inventados."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def _enforce(limiter: RateLimiter, key: str) -> None:
    retry_after = limiter.hit(key)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas requisições. Tente de novo em instantes.",
            headers={"Retry-After": str(int(retry_after))},
        )


# A recomendação faz o cálculo do modelo e consulta a PokéAPI: 20 por minuto por usuário.
recommend_limiter = RateLimiter(limit=20, window_s=60)
# Rotas públicas de leitura: 120 por minuto por IP.
public_limiter = RateLimiter(limit=120, window_s=60)


def limit_recommend(payload: dict = Depends(verify_supabase_token)) -> dict:
    _enforce(recommend_limiter, f"user:{payload['sub']}")
    return payload


def limit_public(request: Request) -> None:
    _enforce(public_limiter, f"ip:{client_ip(request)}")
