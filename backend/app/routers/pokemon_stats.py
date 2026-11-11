import time
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Path
from supabase import Client, create_client

from app.core.config import (
    SMOGON_BADGE_TIERS,
    SMOGON_STATS_TABLE,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)
from app.schemas.pokemon_stats import PokemonStatsResponse, SmogonNamesResponse

router = APIRouter(tags=["Pokemon Stats"])

_supabase: Client = None  # type: ignore

_PAGE_SIZE = 1000
_NAMES_CACHE_TTL_S = 600
_names_cache: Dict[str, object] = {"expires": 0.0, "value": None}


def _get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase


def _latest_date(sb: Client, tier: str) -> Optional[str]:
    rows = (
        sb.table(SMOGON_STATS_TABLE)
        .select("date")
        .eq("tier", tier)
        .order("date", desc=True)
        .limit(1)
        .execute()
    ).data or []
    return rows[0]["date"] if rows else None


def _names_at(sb: Client, tier: str, date: str) -> List[str]:
    names: List[str] = []
    start = 0
    while True:
        rows = (
            sb.table(SMOGON_STATS_TABLE)
            .select("name")
            .eq("tier", tier)
            .eq("date", date)
            .range(start, start + _PAGE_SIZE - 1)
            .execute()
        ).data or []
        names.extend(row["name"] for row in rows)
        if len(rows) < _PAGE_SIZE:
            return names
        start += _PAGE_SIZE


@router.get(
    "/api/smogon/names",
    response_model=SmogonNamesResponse,
    summary="Pokémon com estatísticas da Smogon",
    description=(
        "Nomes (no formato da Smogon) de todos os Pokémon presentes em pelo menos um tier, "
        "no mês mais recente de cada tier. Usado para o selo 'Smogon' da grade. "
        "Resposta em cache durante 10 minutos."
    ),
)
def get_smogon_names():
    now = time.monotonic()
    cached = _names_cache["value"]
    if cached is not None and now < _names_cache["expires"]:
        return cached

    sb = _get_supabase()
    tiers: Dict[str, str] = {}
    names = set()
    for tier in SMOGON_BADGE_TIERS:
        date = _latest_date(sb, tier)
        if date is None:
            continue
        tiers[tier] = date
        names.update(_names_at(sb, tier, date))

    response = SmogonNamesResponse(tiers=tiers, names=sorted(names))
    _names_cache.update(expires=now + _NAMES_CACHE_TTL_S, value=response)
    return response


@router.get(
    "/api/pokemon/{name}/stats",
    response_model=PokemonStatsResponse,
    summary="Estatísticas de um Pokémon na Smogon",
    description=(
        "Retorna as estatísticas de moveset e uso de um Pokémon específico "
        "para um tier e mês da Smogon. Se `date` não for informado, retorna "
        "os dados do mês mais recente disponível."
    ),
)
async def get_pokemon_stats(
    name: str = Path(..., description="Nome do Pokémon (ex: 'Great Tusk')."),
    tier: str = Query(
        "gen9ou",
        description="Tier da Smogon (ex: 'gen9ou', 'gen9uu', 'gen9ubers').",
    ),
    date: Optional[str] = Query(
        None,
        description="Mês de referência (ex: '2026-10'). Se omitido, busca o mais recente.",
    ),
):
    sb = _get_supabase()

    # Se não houver data, busca a mais recente para este Pokémon/tier
    if date is None:
        latest = (
            sb.table(SMOGON_STATS_TABLE)
            .select("date")
            .eq("tier", tier)
            .ilike("name", name)
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
        rows = latest.data or []
        if not rows:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Pokémon '{name}' não encontrado no tier '{tier}'. "
                    "Verifique o nome e o tier informados."
                ),
            )
        date = rows[0]["date"]

    # Consulta os dados completos
    response = (
        sb.table(SMOGON_STATS_TABLE)
        .select("*")
        .eq("tier", tier)
        .eq("date", date)
        .ilike("name", name)
        .limit(1)
        .execute()
    )

    rows = response.data or []
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Pokémon '{name}' não encontrado no tier '{tier}' "
                f"para a data '{date}'."
            ),
        )

    row = rows[0]

    return PokemonStatsResponse(
        name=row.get("name", name),
        tier=row.get("tier", tier),
        date=row.get("date", date),
        raw_count=row.get("raw_count"),
        usage_percent=row.get("usage_percent"),
        abilities=row.get("abilities") or {},
        items=row.get("items") or {},
        moves=row.get("moves") or {},
        spreads=row.get("spreads") or {},
        tera_types=row.get("tera_types") or {},
        teammates=row.get("teammates") or {},
        checks_and_counters=row.get("checks_and_counters") or [],
    )
