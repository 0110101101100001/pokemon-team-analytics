import logging
import re
import asyncio
from typing import List, Dict, Any, Optional

import httpx

logger = logging.getLogger(__name__)

POKEAPI_POKEMON_BASE_URL = "https://pokeapi.co/api/v2/pokemon"
POKEAPI_TYPE_BASE_URL = "https://pokeapi.co/api/v2/type"

_POKEAPI_SEMAPHORE = asyncio.Semaphore(10)
_POKEAPI_POKEMON_CACHE: Dict[str, Optional[Dict[str, Any]]] = {}
_TYPE_NAMES_CACHE: Optional[List[str]] = None
_DAMAGE_RELATIONS_CACHE: Dict[str, Dict[str, Any]] = {}


def normalize_for_pokeapi(name: str) -> str:
    name = name.strip().lower()
    name = name.replace(" ", "-")
    name = re.sub(r"[^a-z0-9\-]", "", name)
    name = re.sub(r"-+", "-", name)
    name = name.strip("-")
    return name


async def fetch_pokemon_data(
    client: httpx.AsyncClient, name: str
) -> Optional[Dict[str, Any]]:
    normalized = normalize_for_pokeapi(name)

    if normalized in _POKEAPI_POKEMON_CACHE:
        return _POKEAPI_POKEMON_CACHE[normalized]

    async with _POKEAPI_SEMAPHORE:
        try:
            url = f"{POKEAPI_POKEMON_BASE_URL}/{normalized}"
            resp = await client.get(url, timeout=10.0)

            if resp.status_code == 404:
                logger.warning("PokeAPI 404 para '%s' (normalizado: '%s')", name, normalized)
                _POKEAPI_POKEMON_CACHE[normalized] = None
                return None

            resp.raise_for_status()
            data = resp.json()

            types = [
                entry["type"]["name"].replace("-", " ").title()
                for entry in data.get("types", [])
            ]

            base_stats = {}
            for stat_entry in data.get("stats", []):
                stat_name = stat_entry["stat"]["name"].replace("-", "_")
                base_stats[stat_name] = int(stat_entry["base_stat"])

            sprites = data.get("sprites", {})
            artwork = sprites.get("other", {}).get("official-artwork", {})
            sprite_url = artwork.get("front_default") or sprites.get("front_default")

            result = {
                "types": types,
                "base_stats": base_stats,
                "sprite_url": sprite_url,
                "pokeapi_error": None,
            }

            _POKEAPI_POKEMON_CACHE[normalized] = result
            return result

        except httpx.HTTPStatusError as exc:
            logger.warning(
                "PokeAPI HTTP error para '%s': %s",
                name,
                exc.response.status_code if exc.response else "unknown",
            )
        except httpx.RequestError as exc:
            logger.warning(
                "PokeAPI request error para '%s': %s",
                name,
                exc,
            )
        except Exception as exc:
            logger.warning(
                "PokeAPI erro inesperado para '%s': %s",
                name,
                exc,
            )

    _POKEAPI_POKEMON_CACHE[normalized] = None
    return None


async def fetch_many_pokemon_data(
    names: List[str],
) -> Dict[str, Optional[Dict[str, Any]]]:
    results: Dict[str, Optional[Dict[str, Any]]] = {}
    unique_names = list(dict.fromkeys(names))

    async with httpx.AsyncClient() as client:
        tasks = [
            fetch_pokemon_data(client, name) for name in unique_names
        ]
        fetched = await asyncio.gather(*tasks, return_exceptions=True)

    for name, result in zip(unique_names, fetched):
        if isinstance(result, Exception):
            logger.error("Exceção ao buscar '%s' na PokeAPI: %s", name, result)
            results[name] = None
        else:
            results[name] = result

    return results


async def fetch_all_type_names(
    client: httpx.AsyncClient,
) -> List[str]:
    global _TYPE_NAMES_CACHE

    if _TYPE_NAMES_CACHE is not None:
        return _TYPE_NAMES_CACHE

    async with _POKEAPI_SEMAPHORE:
        try:
            resp = await client.get(POKEAPI_TYPE_BASE_URL, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            type_names = [
                entry["name"] for entry in data.get("results", [])
            ]
            _TYPE_NAMES_CACHE = type_names
            return type_names
        except Exception as exc:
            logger.error("Erro ao buscar tipos na PokeAPI /type: %s", exc)
            return []


async def fetch_damage_relations(
    client: httpx.AsyncClient, type_name: str
) -> Dict[str, Any]:
    if type_name in _DAMAGE_RELATIONS_CACHE:
        return _DAMAGE_RELATIONS_CACHE[type_name]

    async with _POKEAPI_SEMAPHORE:
        try:
            url = f"{POKEAPI_TYPE_BASE_URL}/{type_name}"
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()

            damage_relations = data.get("damage_relations", {})

            result = {
                "double_damage_from": [
                    entry["name"] for entry in damage_relations.get("double_damage_from", [])
                ],
                "double_damage_to": [
                    entry["name"] for entry in damage_relations.get("double_damage_to", [])
                ],
                "half_damage_from": [
                    entry["name"] for entry in damage_relations.get("half_damage_from", [])
                ],
                "half_damage_to": [
                    entry["name"] for entry in damage_relations.get("half_damage_to", [])
                ],
                "no_damage_from": [
                    entry["name"] for entry in damage_relations.get("no_damage_from", [])
                ],
                "no_damage_to": [
                    entry["name"] for entry in damage_relations.get("no_damage_to", [])
                ],
            }

            _DAMAGE_RELATIONS_CACHE[type_name] = result
            return result

        except Exception as exc:
            logger.error(
                "Erro ao buscar damage_relations do tipo '%s': %s", type_name, exc
            )
            return {}


async def initialize_type_system(
    client: httpx.AsyncClient,
) -> List[str]:
    all_types = await fetch_all_type_names(client)

    if not all_types:
        logger.warning("Não foi possível carregar tipos da PokeAPI.")
        return []

    tasks = [
        fetch_damage_relations(client, type_name) for type_name in all_types
    ]
    await asyncio.gather(*tasks, return_exceptions=True)

    logger.info(
        "Sistema de tipos inicializado: %d tipos carregados da PokeAPI.",
        len(all_types),
    )
    return all_types


def get_all_type_names() -> Optional[List[str]]:
    return _TYPE_NAMES_CACHE


def get_damage_relations(type_name: str) -> Dict[str, Any]:
    return _DAMAGE_RELATIONS_CACHE.get(type_name, {})


def get_pokemon_types_from_pokeapi(
    pokeapi_data: Optional[Dict[str, Any]]
) -> List[str]:
    if not pokeapi_data:
        return []
    return pokeapi_data.get("types", []) or []


def analyze_team_types_from_data(
    team_pokeapi_data: Dict[str, Optional[Dict[str, Any]]],
    all_types: List[str],
) -> Dict[str, Any]:
    covered: set = set()
    for name, data in team_pokeapi_data.items():
        for t in get_pokemon_types_from_pokeapi(data):
            covered.add(t)

    missing = [t for t in all_types if t not in covered]
    return {
        "covered": sorted(covered),
        "missing": missing,
    }


def analyze_team_damage_profile(
    team_pokeapi_data: Dict[str, Optional[Dict[str, Any]]],
    all_types: List[str],
) -> Dict[str, Any]:
    worst_effectiveness: Dict[str, float] = {}
    best_effectiveness: Dict[str, float] = {}

    team_defensive_types: List[List[str]] = []
    for _name, data in team_pokeapi_data.items():
        if not data:
            continue
        types = get_pokemon_types_from_pokeapi(data)
        if types:
            team_defensive_types.append(types)

    if not team_defensive_types:
        return {
            "type_effectiveness": {},
            "best_defense": {},
            "weaknesses_4x": [], "weaknesses_2x": [],
            "resistances_0_25x": [], "resistances_0_5x": [],
            "immunities_0x": [],
            "has_immunity_to": [],
            "has_resistance_to": [],
        }

    for offensive_type in all_types:
        worst = 0.0
        best = float('inf')

        for defensive_types in team_defensive_types:
            mult = get_type_multiplier_offensive_vs_defensive(
                offensive_type, defensive_types, _DAMAGE_RELATIONS_CACHE
            )
            worst = max(worst, mult)
            best = min(best, mult)

        worst_effectiveness[offensive_type] = worst
        best_effectiveness[offensive_type] = best

    weaknesses_4x: set = set()
    weaknesses_2x: set = set()
    resistances_0_25x: set = set()
    resistances_0_5x: set = set()
    immunities_0x: set = set()
    has_immunity_to: set = set()
    has_resistance_to: set = set()

    for offensive_type, worst_mult in worst_effectiveness.items():
        if worst_mult >= 4.0:
            weaknesses_4x.add(offensive_type)
        elif worst_mult == 2.0:
            weaknesses_2x.add(offensive_type)
        elif worst_mult == 0.25:
            resistances_0_25x.add(offensive_type)
        elif worst_mult == 0.5:
            resistances_0_5x.add(offensive_type)
        elif worst_mult == 0.0:
            immunities_0x.add(offensive_type)

    for offensive_type, best_mult in best_effectiveness.items():
        if best_mult == 0.0:
            has_immunity_to.add(offensive_type)
        elif best_mult <= 0.5:
            has_resistance_to.add(offensive_type)

    return {
        "type_effectiveness": worst_effectiveness,
        "best_defense": best_effectiveness,
        "weaknesses_4x": sorted(weaknesses_4x),
        "weaknesses_2x": sorted(weaknesses_2x),
        "resistances_0_25x": sorted(resistances_0_25x),
        "resistances_0_5x": sorted(resistances_0_5x),
        "immunities_0x": sorted(immunities_0x),
        "has_immunity_to": sorted(has_immunity_to),
        "has_resistance_to": sorted(has_resistance_to),
    }


def get_type_multiplier_offensive_vs_defensive(
    offensive_type: str,
    defensive_types: List[str],
    damage_relations_cache: Dict[str, Dict[str, Any]],
) -> float:
    multiplier = 1.0

    for d_type in defensive_types:
        relations = damage_relations_cache.get(d_type.lower(), {})

        if offensive_type in relations.get("no_damage_from", []):
            return 0.0

        if offensive_type in relations.get("double_damage_from", []):
            multiplier *= 2.0
        elif offensive_type in relations.get("half_damage_from", []):
            multiplier *= 0.5

    return multiplier
