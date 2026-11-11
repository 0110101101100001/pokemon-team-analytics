from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any


class PokemonStatsResponse(BaseModel):
    """Estatísticas de um Pokémon específico na Smogon."""

    name: str = Field(..., description="Nome do Pokémon (ex: 'Great Tusk').")
    tier: str = Field(..., description="Tier da Smogon (ex: 'gen9ou').")
    date: str = Field(..., description="Mês de referência dos dados (ex: '2026-10').")
    raw_count: Optional[int] = Field(
        None, description="Quantidade bruta de aparições no mês."
    )
    usage_percent: Optional[float] = Field(
        None, description="Percentual de uso no tier/mês."
    )
    abilities: Dict[str, float] = Field(
        default_factory=dict,
        description="Habilidades e seus percentuais de uso.",
    )
    items: Dict[str, float] = Field(
        default_factory=dict,
        description="Itens e seus percentuais de uso.",
    )
    moves: Dict[str, float] = Field(
        default_factory=dict,
        description="Movimentos e seus percentuais de uso.",
    )
    spreads: Optional[Dict[str, float]] = Field(
        default_factory=dict,
        description="Spreads (nature + EVs) e seus percentuais de uso.",
    )
    tera_types: Optional[Dict[str, float]] = Field(
        default_factory=dict,
        description="Tera Types e seus percentuais de uso.",
    )
    teammates: Dict[str, float] = Field(
        default_factory=dict,
        description="Pokémons aliados mais usados com este Pokémon.",
    )
    checks_and_counters: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Pokémons que fazem check/counter, com score, KO% e switch out%.",
    )


class SmogonNamesResponse(BaseModel):
    """Pokémon presentes em pelo menos um tier da Smogon (mês mais recente de cada tier)."""

    tiers: Dict[str, str] = Field(
        default_factory=dict,
        description="Tiers com dados e o mês usado em cada um (ex: {'gen9ou': '2026-10'}).",
    )
    names: List[str] = Field(
        default_factory=list,
        description="Nomes no formato da Smogon (ex: 'Landorus-Therian'), sem duplicados.",
    )
