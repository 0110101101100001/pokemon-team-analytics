"""Consultas à tabela smogon_stats compartilhadas pelos endpoints e pela recomendação."""

from typing import Any, Dict, List, Optional

from supabase import Client

from app.core.config import SMOGON_STATS_TABLE

# Teto padrão de linhas por resposta do PostgREST no Supabase.
PAGE_SIZE = 1000


def latest_date(sb: Client, tier: str) -> Optional[str]:
    rows = (
        sb.table(SMOGON_STATS_TABLE)
        .select("date")
        .eq("tier", tier)
        .order("date", desc=True)
        .limit(1)
        .execute()
    ).data or []
    return rows[0]["date"] if rows else None


def rows_at(sb: Client, tier: str, date: str, columns: str) -> List[Dict[str, Any]]:
    """Todas as linhas de um tier num mês, paginando além do teto de 1000 linhas."""
    rows: List[Dict[str, Any]] = []
    start = 0
    while True:
        page = (
            sb.table(SMOGON_STATS_TABLE)
            .select(columns)
            .eq("tier", tier)
            .eq("date", date)
            .order("name")
            .range(start, start + PAGE_SIZE - 1)
            .execute()
        ).data or []
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        start += PAGE_SIZE
