// Gera frontend/src/data/battle-data.json a partir dos CSVs oficiais da PokéAPI:
// atributos base de cada Pokémon e o resumo de cada golpe (o mesmo formato de fetchMoveSummary).
// O esboço e o Meta Gauntlet usam esses dados para dezenas de Pokémon de uma vez, sem requisições.
// Uso: node scripts/build-battle-data.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT = fileURLToPath(new URL('../frontend/src/data/battle-data.json', import.meta.url));
const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const DAMAGE_CLASSES = { 1: 'status', 2: 'physical', 3: 'special' };
// Ids ≥ 10000 de golpes são golpes Shadow e Z/Max, fora das batalhas da Geração 9.
const MAIN_SERIES_MAX_ID = 10000;
// Golpes de vários acertos que a PokéAPI publica sem min/max (mesma tabela de services/api.js).
const MULTI_HIT_FALLBACK = { 'population-bomb': [1, 10] };

async function readCsv(name) {
  const response = await fetch(`${CSV_BASE}/${name}.csv`);
  if (!response.ok) throw new Error(`${response.status} ${name}.csv`);
  const [header, ...lines] = (await response.text()).trim().split(/\r?\n/);
  const columns = header.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  });
}

const [pokemonStats, stats, moves, moveMeta, types] = await Promise.all(
  ['pokemon_stats', 'stats', 'moves', 'move_meta', 'types'].map(readCsv),
);

const statSlot = new Map(stats.map((s) => [s.id, STAT_ORDER.indexOf(s.identifier)]));
const baseStats = {};
for (const { pokemon_id: id, stat_id: statId, base_stat: value } of pokemonStats) {
  const slot = statSlot.get(statId);
  if (slot >= 0) (baseStats[id] ??= [0, 0, 0, 0, 0, 0])[slot] = Number(value);
}

const typeName = new Map(types.map((t) => [t.id, t.identifier]));
const metaByMove = new Map(moveMeta.map((m) => [m.move_id, m]));
const moveIndex = {};
for (const move of moves) {
  if (Number(move.id) >= MAIN_SERIES_MAX_ID) continue;
  const meta = metaByMove.get(move.id);
  const [minHits, maxHits] = MULTI_HIT_FALLBACK[move.identifier]
    ?? [Number(meta?.min_hits) || null, Number(meta?.max_hits) || null];
  // [tipo, categoria, poder, prioridade, chance de efeito, min. de acertos, máx. de acertos]
  moveIndex[move.identifier] = [
    typeName.get(move.type_id),
    DAMAGE_CLASSES[move.damage_class_id],
    Number(move.power) || null,
    Number(move.priority) || 0,
    Number(move.effect_chance) || null,
    maxHits > 1 ? minHits : null,
    maxHits > 1 ? maxHits : null,
  ];
}

await writeFile(OUTPUT, `${JSON.stringify({ stats: baseStats, moves: moveIndex })}\n`);
console.log(`battle-data.json: ${Object.keys(baseStats).length} Pokémon, ${Object.keys(moveIndex).length} golpes`);
