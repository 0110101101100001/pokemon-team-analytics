"""Matrizes de afinidade e similaridade de um tier, montadas uma vez por mês da Smogon.

Os dados só mudam na sincronização mensal; a consulta da data mais recente a cada
chamada é o que invalida o cache quando um mês novo chega.
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Tuple

import pandas as pd
from supabase import Client

from app.services.ml_recommendation_service import (
    build_teammate_affinity_matrix,
    compute_item_similarity,
)
from app.services.smogon_repository import latest_date, rows_at

logger = logging.getLogger(__name__)

_MODEL_COLUMNS = "name, usage_percent, teammates"


@dataclass(frozen=True)
class TierModel:
    date: str
    similarity_matrix: pd.DataFrame
    usage_map: Dict[str, float]
    by_usage: List[str]


_cache: Dict[Tuple[str, str], TierModel] = {}


def load_tier_model(sb: Client, tier: str) -> TierModel:
    date = latest_date(sb, tier)
    if date is None:
        raise ValueError(f"Nenhuma estatística encontrada para o tier '{tier}'.")

    key = (tier, date)
    model = _cache.get(key)
    if model is not None:
        return model

    rows = rows_at(sb, tier, date, _MODEL_COLUMNS)
    if not rows:
        raise ValueError(f"Nenhum dado para o mês mais recente ({date}) no tier '{tier}'.")

    affinity_matrix, usage_map = build_teammate_affinity_matrix(rows)
    model = TierModel(
        date=date,
        similarity_matrix=compute_item_similarity(affinity_matrix),
        usage_map=usage_map,
        by_usage=sorted(usage_map, key=usage_map.get, reverse=True),
    )

    # Um mês novo substitui o anterior do mesmo tier.
    for stale in [k for k in _cache if k[0] == tier]:
        del _cache[stale]
    _cache[key] = model
    logger.info("Modelo do tier %s (%s) montado com %d Pokémon", tier, date, len(usage_map))
    return model
