import logging
from typing import List, Dict, Any, Set, Tuple
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.services.pokeapi_service import (
    fetch_many_pokemon_data,
    get_pokemon_types_from_pokeapi,
)

logger = logging.getLogger(__name__)

WEIGHT_AFFINITY = 0.50
WEIGHT_USAGE = 0.30
WEIGHT_TYPE_COVERAGE = 0.20


def build_teammate_affinity_matrix(
    rows: List[Dict[str, Any]],
) -> Tuple[pd.DataFrame, Dict[str, float]]:
    all_names: Set[str] = set()
    teammate_data: Dict[str, Dict[str, float]] = {}
    usage_map: Dict[str, float] = {}

    for row in rows:
        name = row.get("name")
        usage = row.get("usage_percent")
        teammates = row.get("teammates") or {}

        if not name:
            continue

        clean_teammates: Dict[str, float] = {}
        for t_name, pct in teammates.items():
            clean_key = str(t_name).strip()
            all_names.add(clean_key)
            try:
                clean_teammates[clean_key] = float(pct)
            except (ValueError, TypeError):
                clean_teammates[clean_key] = 0.0

        all_names.add(name)
        teammate_data[name] = clean_teammates

        try:
            usage_map[name] = float(usage) if usage is not None else 0.0
        except (ValueError, TypeError):
            usage_map[name] = 0.0

    all_names = sorted(list(all_names))

    matrix = pd.DataFrame(
        0.0, index=all_names, columns=all_names, dtype=float
    )

    for name, teammates in teammate_data.items():
        for t_name, pct in teammates.items():
            if t_name in matrix.columns:
                matrix.loc[name, t_name] = pct

    return matrix, usage_map


def compute_item_similarity(affinity_matrix: pd.DataFrame) -> pd.DataFrame:
    if affinity_matrix.empty:
        return affinity_matrix

    similarity_values = cosine_similarity(affinity_matrix.values)
    similarity_df = pd.DataFrame(
        similarity_values,
        index=affinity_matrix.index,
        columns=affinity_matrix.columns,
    )
    return similarity_df


def get_affinity_recommendations(
    team: List[str],
    similarity_matrix: pd.DataFrame,
    usage_map: Dict[str, float],
    top_k: int = 20,
) -> List[Dict[str, Any]]:
    team_set = {t.strip().lower() for t in team}
    candidate_scores: Dict[str, float] = {}
    best_synergy_source: Dict[str, str] = {}

    for member in team:
        member_clean = member.strip()
        if member_clean not in similarity_matrix.index:
            continue

        member_usage = usage_map.get(member_clean, 1.0)

        sim_series = similarity_matrix.loc[member_clean].sort_values(ascending=False)

        for candidate, sim_score in sim_series.items():
            candidate_clean = str(candidate).strip()

            if candidate_clean.lower() in team_set:
                continue
            if candidate_clean.lower() == member_clean.lower():
                continue

            if sim_score <= 0:
                continue

            weight = sim_score * member_usage

            if candidate_clean not in candidate_scores or weight > candidate_scores[candidate_clean]:
                candidate_scores[candidate_clean] = weight
                best_synergy_source[candidate_clean] = member_clean

    ranked = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)

    results = []
    for name, score in ranked[:top_k]:
        results.append({
            "name": name,
            "affinity_score": float(score),
            "synergy_with": best_synergy_source.get(name, ""),
        })

    return results


def normalize_scores(
    candidates: List[Dict[str, Any]],
    usage_map: Dict[str, float],
) -> List[Dict[str, Any]]:
    if not candidates:
        return candidates

    affinity_scores = [c.get("affinity_score", 0.0) for c in candidates]
    usage_scores = [usage_map.get(c["name"], 0.0) for c in candidates]

    def minmax(vals: List[float]) -> List[float]:
        v_min = min(vals)
        v_max = max(vals)
        if v_max == v_min:
            return [1.0] * len(vals)
        return [(v - v_min) / (v_max - v_min) for v in vals]

    norm_affinity = minmax(affinity_scores)
    norm_usage = minmax(usage_scores)

    for i, c in enumerate(candidates):
        c["affinity_norm"] = norm_affinity[i]
        c["usage_norm"] = norm_usage[i]

    return candidates


def compute_type_coverage_score(
    candidate_types: List[str],
    missing_types: List[str],
) -> float:
    if not missing_types:
        return 0.0

    covered = [t for t in candidate_types if t in missing_types]
    return len(covered) / len(missing_types)


def build_composite_recommendations(
    team: List[str],
    affinity_results: List[Dict[str, Any]],
    usage_map: Dict[str, float],
    pokeapi_data_map: Dict[str, Optional[Dict[str, Any]]],
    missing_types: List[str],
    top_k: int = 10,
) -> List[Dict[str, Any]]:
    normalized = normalize_scores(affinity_results, usage_map)

    composite_results: List[Dict[str, Any]] = []

    for cand in normalized:
        name = cand["name"]
        pokeapi_data = pokeapi_data_map.get(name) or {}
        types = get_pokemon_types_from_pokeapi(pokeapi_data)

        type_score = compute_type_coverage_score(types, missing_types)

        affinity = cand.get("affinity_norm", 0.0)
        usage = cand.get("usage_norm", 0.0)

        composite = (
            WEIGHT_AFFINITY * affinity
            + WEIGHT_USAGE * usage
            + WEIGHT_TYPE_COVERAGE * type_score
        )

        reason_parts: List[str] = []
        synergy_with = cand.get("synergy_with", "")
        if synergy_with:
            reason_parts.append(f"Alta sinergia com {synergy_with}")
        if type_score > 0:
            covered_types = [t for t in types if t in missing_types]
            reason_parts.append(f"Cobre tipos faltando: {', '.join(covered_types)}")
        raw_usage = usage_map.get(name, 0)
        if raw_usage > 0:
            reason_parts.append(f"Uso no meta: {raw_usage:.1f}%")
        if not reason_parts:
            reason_parts.append("Boa opção estatística")

        composite_results.append({
            "name": name,
            "composite_score": round(composite, 4),
            "ml_affinity_score": round(cand.get("affinity_score", 0), 4),
            "affinity_norm": round(affinity, 4),
            "usage_norm": round(usage, 4),
            "type_coverage_score": round(type_score, 4),
            "usage_percent": round(raw_usage, 2) if raw_usage else None,
            "synergy_with": synergy_with or None,
            "types": types if types else None,
            "base_stats": pokeapi_data.get("base_stats"),
            "sprite_url": pokeapi_data.get("sprite_url"),
            "reason": "; ".join(reason_parts),
            "pokeapi_error": pokeapi_data.get("pokeapi_error"),
        })

    composite_results.sort(key=lambda x: x["composite_score"], reverse=True)
    return composite_results[:top_k]
