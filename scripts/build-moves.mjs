// Gera frontend/src/data/moves.json a partir dos CSVs oficiais da PokéAPI: todos os golpes que algum Pokémon aprende.
// A API REST só expõe os golpes um a um (quase mil pedidos); os CSVs trazem tudo de uma vez.
// Golpes Z, Max e Shadow ficam de fora: nenhum Pokémon os aprende.
// Uso: node scripts/build-moves.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT = fileURLToPath(new URL('../frontend/src/data/moves.json', import.meta.url));
const DAMAGE_CLASSES = { 1: 'status', 2: 'physical', 3: 'special' };

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

const numberOrNull = (value) => (value === '' || value == null ? null : Number(value));

const [moves, types, pokemonMoves] = await Promise.all(['moves', 'types', 'pokemon_moves'].map(readCsv));

const typeName = new Map(types.map((t) => [t.id, t.identifier]));
const learnable = new Set(pokemonMoves.map((row) => row.move_id));

// [slug, tipo, categoria, poder, precisão, PP, geração], em ordem alfabética.
const list = moves
  .filter((move) => learnable.has(move.id))
  .map((move) => [
    move.identifier,
    typeName.get(move.type_id) ?? null,
    DAMAGE_CLASSES[move.damage_class_id] ?? null,
    numberOrNull(move.power),
    numberOrNull(move.accuracy),
    numberOrNull(move.pp),
    Number(move.generation_id),
  ])
  .sort((a, b) => a[0].localeCompare(b[0]));

await writeFile(OUTPUT, `${JSON.stringify(list)}\n`);
console.log(`moves.json: ${list.length} golpes → ${OUTPUT}`);
