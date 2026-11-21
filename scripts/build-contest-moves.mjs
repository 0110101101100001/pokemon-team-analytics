// Gera frontend/src/data/contest-moves.json a partir dos CSVs oficiais da PokéAPI: categoria de Contest de cada golpe,
// efeito e apelo nos Contests (3ª geração e ORAS) e nos Super Contests (4ª geração) e os combos.
// Os textos dos efeitos ficam traduzidos em frontend/src/data/contestEffects.js, pelo id.
// Uso: node scripts/build-contest-moves.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT = fileURLToPath(new URL('../frontend/src/data/contest-moves.json', import.meta.url));

async function readCsv(name) {
  const response = await fetch(`${CSV_BASE}/${name}.csv`);
  if (!response.ok) throw new Error(`${response.status} ${name}.csv`);
  const [header, ...lines] = (await response.text()).trim().split(/\r?\n/);
  const columns = header.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
  });
}

const [moves, types, contestTypes, effects, superEffects, combos, superCombos] = await Promise.all([
  'moves', 'types', 'contest_types', 'contest_effects', 'super_contest_effects', 'contest_combos', 'super_contest_combos',
].map(readCsv));

const slugById = new Map(moves.map((move) => [move.id, move.identifier]));
const typeById = new Map(types.map((type) => [type.id, type.identifier]));
const contestTypeById = new Map(contestTypes.map((type) => [type.id, type.identifier]));

// Golpe → golpes que ele prepara (o combo vale quando o segundo vem logo depois dele).
const nextOf = (rows) => rows.reduce((map, row) => {
  const first = slugById.get(row.first_move_id);
  const second = slugById.get(row.second_move_id);
  return first && second ? map.set(first, [...(map.get(first) ?? []), second]) : map;
}, new Map());
const contestNext = nextOf(combos);
const superNext = nextOf(superCombos);

const number = (value) => (value === '' ? null : Number(value));

// [slug, tipo, categoria do Contest, efeito, efeito do Super Contest, combos, combos do Super Contest]
const list = moves
  .filter((move) => move.contest_type_id && Number(move.id) < 10000)
  .map((move) => [
    move.identifier,
    typeById.get(move.type_id) ?? null,
    contestTypeById.get(move.contest_type_id),
    number(move.contest_effect_id),
    number(move.super_contest_effect_id),
    contestNext.get(move.identifier) ?? [],
    superNext.get(move.identifier) ?? [],
  ])
  .sort((a, b) => a[0].localeCompare(b[0]));

const output = {
  // id → [apelo, jam]
  effects: Object.fromEntries(effects.map((effect) => [effect.id, [Number(effect.appeal), Number(effect.jam)]])),
  // id → apelo
  superEffects: Object.fromEntries(superEffects.map((effect) => [effect.id, Number(effect.appeal)])),
  moves: list,
};

await writeFile(OUTPUT, `${JSON.stringify(output)}\n`);
console.log(`contest-moves.json: ${list.length} golpes → ${OUTPUT}`);
