"""Consultas à tabela smogon_stats compartilhadas pelos endpoints e pela recomendação."""

from typing import Any, Dict, List, Optional

from supabase import Client

from app.core.config import SMOGON_STATS_TABLE

# Teto padrão de linhas por resposta do PostgREST no Supabase.
PAGE_SIZE = 1000


def month_start(month: str) -> str:
    """'2026-10' → '2026-10-01', o valor de ``date_month`` (date, dia 1) na tabela."""
    return f"{month}-01"


def month_of(date_month: str) -> str:
    """'2026-10-01' → '2026-10': a API continua respondendo o mês no formato da Smogon."""
    return date_month[:7]


def latest_date(sb: Client, tier: str) -> Optional[str]:
    """Mês mais recente de um tier ('AAAA-MM'), ou None sem dados."""
    rows = (
        sb.table(SMOGON_STATS_TABLE)
        .select("date_month")
        .eq("tier", tier)
        .order("date_month", desc=True)
        .limit(1)
        .execute()
    ).data or []
    return month_of(rows[0]["date_month"]) if rows else None


def rows_at(sb: Client, tier: str, date: str, columns: str) -> List[Dict[str, Any]]:
    """Todas as linhas de um tier num mês ('AAAA-MM'), paginando além do teto de 1000 linhas."""
    rows: List[Dict[str, Any]] = []
    start = 0
    while True:
        page = (
            sb.table(SMOGON_STATS_TABLE)
            .select(columns)
            .eq("tier", tier)
            .eq("date_month", month_start(date))
            .order("name")
            .range(start, start + PAGE_SIZE - 1)
            .execute()
        ).data or []
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        start += PAGE_SIZE
