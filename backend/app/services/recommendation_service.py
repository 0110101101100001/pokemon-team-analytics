import logging
from typing import List, Dict, Any, Set
import pandas as pd
from supabase import Client
import httpx

from app.schemas.recommendation import (
    RecommendRequest,
    RecommendResponse,
    PokemonRecommendation,
)
from app.core.config import SMOGON_STATS_TABLE, DEFAULT_TIER
from app.services.ml_recommendation_service import (
    build_teammate_affinity_matrix,
    compute_item_similarity,
    get_affinity_recommendations,
    build_composite_recommendations,
)
from app.services.pokeapi_service import (
    fetch_many_pokemon_data,
    get_pokemon_types_from_pokeapi,
    analyze_team_damage_profile,
    fetch_all_type_names,
    initialize_type_system,
)

logger = logging.getLogger(__name__)


async def build_recommendation(
    request: RecommendRequest,
    supabase: Client,
) -> RecommendResponse:
    tier = request.tier or DEFAULT_TIER
    team = [t.strip() for t in request.team if t.strip()]
    team_lower = {t.lower() for t in team}

    logger.info(
        "Iniciando recomendação ML | tier=%s | time=%s", tier, team
    )

    response = supabase.table(SMOGON_STATS_TABLE).select("*").eq("tier", tier).execute()
    rows = response.data or []

    if not rows:
        raise ValueError(f"Nenhuma estatística encontrada para o tier '{tier}'.")

    df = pd.DataFrame(rows)

    df["usage_percent"] = pd.to_numeric(df["usage_percent"], errors="coerce")
    df["raw_count"] = pd.to_numeric(df["raw_count"], errors="coerce")

    if "date" not in df.columns or df["date"].isna().all():
        raise ValueError(f"Coluna 'date' ausente ou vazia para o tier '{tier}'.")

    latest_date = df["date"].max()
    df_recent = df[df["date"] == latest_date].copy()

    if df_recent.empty:
        raise ValueError(
            f"Nenhum dado para o mês mais recente ({latest_date}) no tier '{tier}'."
        )

    async with httpx.AsyncClient() as client:
        all_types = await initialize_type_system(client)

        if not all_types:
            raise ValueError(
                "Não foi possível carregar os tipos oficiais da PokeAPI."
            )

        rows_recent = df_recent.to_dict("records")

        affinity_matrix, usage_map = build_teammate_affinity_matrix(rows_recent)
        similarity_matrix = compute_item_similarity(affinity_matrix)

        affinity_results = get_affinity_recommendations(
            team=team,
            similarity_matrix=similarity_matrix,
            usage_map=usage_map,
            top_k=max(request.limit or 5, 1) * 4,
        )

        if not affinity_results:
            logger.warning("Nenhum candidato de afinidade encontrado. Usando fallback por uso.")
            fallback_candidates = df_recent[
                ~df_recent["name"].str.lower().isin(team_lower)
            ].sort_values("usage_percent", ascending=False)
            affinity_results = [
                {
                    "name": str(row["name"]),
                    "affinity_score": 0.0,
                    "synergy_with": "",
                }
                for _, row in fallback_candidates.head(max(request.limit or 5, 1) * 4).iterrows()
            ]

        team_pokeapi_data = await fetch_many_pokemon_data(team)
        team_analysis = analyze_team_damage_profile(team_pokeapi_data, all_types)
        missing_types = team_analysis.get("missing", [])

        logger.info(
            "Tipos faltando: %s | Candidatos de afinidade: %d",
            missing_types,
            len(affinity_results),
        )

        candidate_names = [c["name"] for c in affinity_results]
        candidate_pokeapi_data = await fetch_many_pokemon_data(candidate_names)

        composite = build_composite_recommendations(
            team=team,
            affinity_results=affinity_results,
            usage_map=usage_map,
            pokeapi_data_map=candidate_pokeapi_data,
            missing_types=missing_types,
            top_k=max(request.limit or 5, 1),
        )

    recommendations: List[PokemonRecommendation] = []

    for item in composite:
        name = item["name"]
        pokeapi_data = candidate_pokeapi_data.get(name) or {}
        types = get_pokemon_types_from_pokeapi(pokeapi_data)
        raw_usage = item.get("usage_percent")

        confidence = round(min(max(item.get("composite_score", 0.0), 0.0), 1.0), 2)

        recommendations.append(
            PokemonRecommendation(
                name=name,
                tier=tier,
                usage_percent=raw_usage,
                raw_count=None,
                reason=item.get("reason", ""),
                confidence_score=confidence,
                counters=None,
                teammates=None,
                types=types if types else None,
                base_stats=pokeapi_data.get("base_stats"),
                sprite_url=pokeapi_data.get("sprite_url"),
                pokeapi_error=pokeapi_data.get("pokeapi_error"),
                ml_affinity_score=item.get("ml_affinity_score"),
                composite_score=item.get("composite_score"),
                affinity_norm=item.get("affinity_norm"),
                usage_norm=item.get("usage_norm"),
                type_coverage_score=item.get("type_coverage_score"),
                synergy_with=item.get("synergy_with"),
            )
        )

    main_rec = recommendations[0] if recommendations else None

    return RecommendResponse(
        recommended=main_rec,
        alternatives=recommendations[1:],
        team_coverage={
            **team_analysis,
            "missing_types": missing_types,
        },
        missing_types=missing_types,
    )
