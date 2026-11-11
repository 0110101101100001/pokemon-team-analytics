from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class RecommendRequest(BaseModel):
    team: List[str] = Field(
        ...,
        min_items=1,
        max_items=5,
        example=["Great Tusk", "Gholdengo", "Kingambit"],
        description="Lista de nomes dos Pokémon já presentes no time (máximo 5).",
    )
    tier: Optional[str] = Field(
        "gen9ou",
        description="Tier da Smogon para filtrar as estatísticas.",
    )
    limit: Optional[int] = Field(
        5,
        ge=1,
        le=10,
        description="Quantidade de alternativas a retornar além da recomendação principal.",
    )


class PokemonRecommendation(BaseModel):
    name: str
    tier: str
    usage_percent: Optional[float] = None
    raw_count: Optional[int] = None
    reason: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    counters: Optional[list] = None
    teammates: Optional[dict] = None

    # Dados oficiais da PokeAPI
    types: Optional[List[str]] = Field(
        None,
        description="Tipos oficiais do Pokémon (ex: ['Ground', 'Fighting']).",
    )
    base_stats: Optional[Dict[str, int]] = Field(
        None,
        description="Estatísticas base do Pokémon (hp, attack, defense, etc.).",
    )
    sprite_url: Optional[str] = Field(
        None,
        description="URL da imagem oficial (sprite) do Pokémon.",
    )
    pokeapi_error: Optional[str] = Field(
        None,
        description="Mensagem de erro se a PokeAPI falhou para este Pokémon.",
    )

    # Campos de Machine Learning
    ml_affinity_score: Optional[float] = Field(
        None,
        description="Score bruto de afinidade por coocorrência de teammates (ML).",
    )
    composite_score: Optional[float] = Field(
        None,
        description="Score composto final (ML + uso + cobertura de tipos).",
    )
    affinity_norm: Optional[float] = Field(
        None,
        description="Afinidade normalizada (0-1).",
    )
    usage_norm: Optional[float] = Field(
        None,
        description="Uso normalizado (0-1).",
    )
    type_coverage_score: Optional[float] = Field(
        None,
        description="Score de cobertura de tipos faltando (0-1).",
    )
    synergy_with: Optional[str] = Field(
        None,
        description="Pokémon do time com maior sinergia direta com este candidato.",
    )


class RecommendResponse(BaseModel):
    recommended: Optional[PokemonRecommendation] = None
    alternatives: List[PokemonRecommendation] = []
    team_coverage: Dict[str, Any]
    missing_types: List[str]
    algorithm: str = Field(
        default="ml_item_item_collaborative_filtering",
        description="Algoritmo utilizado para gerar a recomendação.",
    )
