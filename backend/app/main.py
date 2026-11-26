import logging
import threading

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

from app.core.config import (
    ALLOWED_ORIGINS,
    DEFAULT_TIER,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)
from app.core.rate_limit import limit_recommend
from app.core.security import verify_sync_token
from app.schemas.recommendation import RecommendRequest, RecommendResponse
from app.scrapers.update_smogon import run_sync
from app.services.recommendation_service import build_recommendation
from app.routers.pokemon_stats import router as pokemon_stats_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Pokemon Team Analytics API",
    version="1.0.0",
    description="Microsserviço de recomendação de times de Pokémon com dados da Smogon e autenticação Supabase.",
)

# A autenticação vai no cabeçalho Authorization (sem cookies), por isso
# allow_credentials fica desligado.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app.include_router(pokemon_stats_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "default_tier": DEFAULT_TIER}


@app.post(
    "/api/recommend",
    response_model=RecommendResponse,
    dependencies=[Depends(limit_recommend)],
    tags=["Recommendation"],
)
async def recommend(request: RecommendRequest):
    try:
        return await build_recommendation(request, supabase)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except HTTPException:
        raise
    except Exception:
        # O detalhe fica no log do servidor; o cliente não recebe mensagens internas (caminhos, SQL, chaves).
        logger.exception("Falha inesperada em /api/recommend")
        raise HTTPException(status_code=500, detail="Erro inesperado ao gerar a recomendação.")


# Uma sincronização por vez: outra chamada durante a execução recebe 409 em vez de abrir um segundo scraper.
_sync_lock = threading.Lock()


def _run_sync_locked() -> None:
    try:
        run_sync()
    except Exception:
        logger.exception("Falha na sincronização da Smogon")
    finally:
        _sync_lock.release()


@app.post(
    "/api/admin/sync-smogon",
    dependencies=[Depends(verify_sync_token)],
    tags=["Admin"],
)
async def sync_smogon(background_tasks: BackgroundTasks):
    """Dispara a sincronização sob demanda das estatísticas da Smogon no Supabase.

    Executa o scraper de movesets/estatísticas da Smogon em segundo plano e
    grava os resultados na tabela ``smogon_stats`` (upsert por ``name, tier, date_month``).

    Requer o token do workflow smogon-sync.yml (role ``smogon-sync``); tokens de usuário recebem 403.
    """
    if not _sync_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Já existe uma sincronização em andamento.")
    background_tasks.add_task(_run_sync_locked)
    return {
        "status": "accepted",
        "message": "Sincronização da Smogon iniciada em segundo plano.",
        "endpoint": "/api/admin/sync-smogon",
    }
