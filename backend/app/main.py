from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from supabase import create_client, Client

from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEFAULT_TIER
from app.core.security import verify_supabase_token
from app.schemas.recommendation import RecommendRequest, RecommendResponse
from app.scrapers.update_smogon import run_sync
from app.services.recommendation_service import build_recommendation
from app.routers.pokemon_stats import router as pokemon_stats_router

app = FastAPI(
    title="Pokemon Team Analytics API",
    version="1.0.0",
    description="Microsserviço de recomendação de times de Pokémon com dados da Smogon e autenticação Supabase.",
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app.include_router(pokemon_stats_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "default_tier": DEFAULT_TIER}


@app.post(
    "/api/recommend",
    response_model=RecommendResponse,
    dependencies=[Depends(verify_supabase_token)],
    tags=["Recommendation"],
)
async def recommend(request: RecommendRequest):
    try:
        return await build_recommendation(request, supabase)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro inesperado: {exc}")


@app.post(
    "/api/admin/sync-smogon",
    dependencies=[Depends(verify_supabase_token)],
    tags=["Admin"],
)
async def sync_smogon(background_tasks: BackgroundTasks):
    """Dispara a sincronização sob demanda das estatísticas da Smogon no Supabase.

    Executa o scraper de movesets/estatísticas da Smogon em segundo plano e
    grava os resultados na tabela ``smogon_stats`` (upsert por ``name, tier, date``).

    Requer autenticação via JWT do Supabase (mesma dependência usada em /api/recommend).
    """
    background_tasks.add_task(run_sync)
    return {
        "status": "accepted",
        "message": "Sincronização da Smogon iniciada em segundo plano.",
        "endpoint": "/api/admin/sync-smogon",
    }
