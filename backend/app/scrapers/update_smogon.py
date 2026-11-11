import os
import re
from pathlib import Path
from typing import List, Optional

import requests
from dotenv import load_dotenv
from supabase import Client, create_client

# Carrega o .env da raiz do backend (subindo 2 níveis a partir de scrapers/)
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError(f"As variáveis não foram encontradas em: {env_path}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Seções exatas do arquivo de moveset do Smogon
SECTIONS = ["Abilities", "Items", "Spreads", "Moves", "Tera Types", "Teammates", "Checks and Counters"]
# Metadados que sempre vêm logo após o nome do Pokémon
METADATA_KEYS = ("Raw count:", "Avg. weight:", "Viability Ceiling:")

# Tiers da Geração 9 processados por padrão (os mesmos do seletor competitivo do frontend).
DEFAULT_TIERS_GEN9: List[str] = [
    "gen9ou",
    "gen9ubers",
    "gen9uu",
    "gen9ru",
    "gen9nu",
    "gen9pu",
    "gen9lc",
    "gen9doublesou",
]

# Linhas enviadas ao Supabase por pedido de upsert.
UPSERT_BATCH_SIZE = 200
REQUEST_TIMEOUT_S = 60


def _is_border(line: str) -> bool:
    """True se a linha for um separador visual vazio (+---...) ou branco."""
    s = line.strip()
    if not s:
        return True
    return all(ch in "-+ " for ch in s)


def _new_poke(name: str) -> dict:
    return {
        "name": name,
        "raw_count": 0,
        "avg_weight": 0.0,
        "viability_ceiling": 0,
        "abilities": {},
        "items": {},
        "spreads": {},
        "moves": {},
        "tera_types": {},
        "teammates": {},
        "checks_and_counters": [],
    }


def parse_moveset_stats(file_content: str) -> list:
    """Parse do arquivo de moveset do Smogon (.txt).

    Estratégia: varre linha a linha (sem fazer split pelo separador de borda,
    que aparece entre *todas* as subseções). Um novo bloco de Pokémon é aberto
    sempre que detectamos o padrão:  <nome>  seguido (ignorando bordas) de  <Raw count:>.
    Isso garante que apenas o nome oficial do Pokémon entre em pokemon_name e que
    itens/habilidades/movimentos/spreads/counters fiquem agrupados no mesmo dicionário.
    """
    raw_lines = file_content.splitlines()
    # Normaliza: remove bordas '|' e espaços, descarta linhas em branco e separadores visuais
    lines = []
    for line in raw_lines:
        s = line.strip("|").strip()
        if _is_border(s):
            continue
        lines.append(s)

    parsed_data = []
    current = None
    current_section = None
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]

        # Lookahead: próximo conteúdo não-bordas
        j = i + 1
        while j < n and _is_border(lines[j]):
            j += 1
        next_is_metadata = j < n and lines[j].startswith(METADATA_KEYS)

        # Detecção do nome do Pokémon: linha simples (não metadado, não título de seção)
        # cujo próximo conteúdo significativo é metadado.
        is_pokemon_name = (
            not line.startswith(METADATA_KEYS)
            and line not in SECTIONS
            and next_is_metadata
        )

        if is_pokemon_name:
            # Fecha o bloco anterior (se houver) e inicia um novo
            if current is not None and current["name"]:
                parsed_data.append(current)
            current = _new_poke(line)
            current_section = None
            i += 1
            continue

        if current is None:
            i += 1
            continue

        # --- Metadados do Pokémon ---
        if line.startswith("Raw count:"):
            try:
                current["raw_count"] = int(line.split(":", 1)[1].strip())
            except ValueError:
                pass
            i += 1
            continue
        elif line.startswith("Avg. weight:"):
            try:
                current["avg_weight"] = float(line.split(":", 1)[1].strip())
            except ValueError:
                pass
            i += 1
            continue
        elif line.startswith("Viability Ceiling:"):
            try:
                current["viability_ceiling"] = int(line.split(":", 1)[1].strip())
            except ValueError:
                pass
            i += 1
            continue

        # --- Títulos de seção ---
        if line in SECTIONS:
            current_section = line
            i += 1
            continue

        # --- Conteúdo das seções (chave-valor com %) ---
        if current_section in ["Abilities", "Items", "Moves", "Tera Types", "Teammates"]:
            match = re.match(r"(.+?)\s+([\d\.]+)%", line)
            if match:
                name, pct = match.groups()
                target = {
                    "Abilities": current["abilities"],
                    "Items": current["items"],
                    "Moves": current["moves"],
                    "Tera Types": current["tera_types"],
                    "Teammates": current["teammates"],
                }[current_section]
                target[name.strip()] = float(pct)
            i += 1
            continue

        # --- Spreads (aceita natures com '/', ex: Jolly:0/252/4/0/0/252) ---
        elif current_section == "Spreads":
            match = re.match(r"(.+?)\s+([\d\.]+)%", line)
            if match:
                spread, pct = match.groups()
                current["spreads"][spread.strip()] = float(pct)
            i += 1
            continue

        # --- Checks and Counters (com linha de KO/switch na sequência) ---
        elif current_section == "Checks and Counters":
            counter_match = re.match(r"(.+?)\s+([\d\.]+)\s+\(([\d\.]+)[±]([\d\.]+)\)", line)
            if counter_match:
                c_name, score, _mean, _err = counter_match.groups()
                ko_pct, switch_pct = 0.0, 0.0
                k = i + 1
                while k < n and _is_border(lines[k]):
                    k += 1
                if k < n:
                    sub_match = re.search(
                        r"\(([\d\.]+)%\s+KOed\s+/\s+([\d\.]+)%\s+switched out\)", lines[k]
                    )
                    if sub_match:
                        ko_pct, switch_pct = map(float, sub_match.groups())
                        i = k  # consome a próxima linha
                current["checks_and_counters"].append({
                    "pokemon": c_name.strip(),
                    "score": float(score),
                    "ko_pct": ko_pct,
                    "switch_pct": switch_pct,
                })
            i += 1
            continue

        i += 1

    # Último bloco
    if current is not None and current["name"]:
        parsed_data.append(current)

    return parsed_data


def parse_general_stats(file_content: str) -> dict:
    general_data = {}
    lines = file_content.splitlines()
    for line in lines:
        if "|" in line:
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) >= 4 and parts[0].isdigit():
                try:
                    rank = int(parts[0])
                    name = parts[1]
                    usage_pct = float(parts[2].replace('%', ''))
                    raw_count = int(parts[3])
                    general_data[name] = {
                        "rank": rank,
                        "usage_percentage": usage_pct,
                        "raw_count_general": raw_count,
                    }
                except ValueError:
                    continue
    return general_data


def run_sync(
    date: str = "2026-10",
    tiers: Optional[List[str]] = None,
) -> dict:
    """Executa a sincronização completa de estatísticas da Smogon no Supabase.

    Para cada tier, baixa o arquivo de moveset e o de estatísticas gerais,
    faz o parsing, limpa as linhas antigas do tier/mês e faz upsert dos dados.

    Retorna um resumo com os tiers processados e a quantidade de Pokémons.
    """
    if tiers is None:
        tiers = DEFAULT_TIERS_GEN9

    results = {
        "date": date,
        "tiers_processados": [],
        "total_pokemons": 0,
        "errors": [],
    }

    for tier_base in tiers:
        # O arquivo da Smogon segue o padrão: <tier>-0.txt
        tier_file = f"{tier_base}-0"

        url_general = f"https://www.smogon.com/stats/{date}/{tier_file}.txt"
        url_moveset = f"https://www.smogon.com/stats/{date}/moveset/{tier_file}.txt"

        print(f"\n=== Processando tier: {tier_base} ===")
        print(f"Baixando estatísticas gerais de: {url_general}...")
        resp_general = requests.get(url_general, timeout=REQUEST_TIMEOUT_S)

        print(f"Baixando movesets de: {url_moveset}...")
        resp_moveset = requests.get(url_moveset, timeout=REQUEST_TIMEOUT_S)

        if resp_moveset.status_code != 200:
            msg = f"Erro ao baixar o moveset de {tier_base}: Status {resp_moveset.status_code}. Pulando tier..."
            print(msg)
            results["errors"].append({tier_base: msg})
            continue

        moveset_data = parse_moveset_stats(resp_moveset.text)
        general_data = parse_general_stats(resp_general.text) if resp_general.status_code == 200 else {}

        print(f"Processados {len(moveset_data)} Pokémons de {tier_base}. Enviando ao Supabase...")

        # Limpa a tabela do tier/mês antes de reenviar (evita registros lixo anteriores)
        supabase.table("smogon_stats").delete().eq("tier", tier_base).eq("date", date).execute()

        payloads = [
            {
                "name": poke["name"],
                "tier": tier_base,          # campo `format` da tabela (nome real da coluna: tier)
                "date": date,
                "raw_count": poke["raw_count"],
                "usage_percent": general_data.get(poke["name"], {}).get("usage_percentage"),
                "abilities": poke["abilities"],
                "items": poke["items"],
                "spreads": poke["spreads"],
                "moves": poke["moves"],
                "teammates": poke["teammates"],
                "checks_and_counters": poke["checks_and_counters"],
            }
            for poke in moveset_data
        ]

        # Upsert em lotes usando a restrição de conflito única: (name, tier, date)
        for start in range(0, len(payloads), UPSERT_BATCH_SIZE):
            supabase.table("smogon_stats").upsert(
                payloads[start:start + UPSERT_BATCH_SIZE], on_conflict="name,tier,date"
            ).execute()
        count = len(payloads)

        results["tiers_processados"].append({
            "tier": tier_base,
            "pokemons": count,
        })
        results["total_pokemons"] += count
        print(f"Tier {tier_base} sincronizado com sucesso!")

    print("\nBanco de dados sincronizado com sucesso para todos os tiers!")
    return results


if __name__ == "__main__":
    run_sync()
