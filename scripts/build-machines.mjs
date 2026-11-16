// Gera frontend/src/data/machines.json a partir dos CSVs oficiais da PokéAPI e, em data/machine-learners/,
// um arquivo por jogo com os Pokémon que aprendem cada golpe por máquina ({ golpe: [ids] }).
// A API REST só expõe as máquinas uma a uma (mais de 2000 pedidos); os CSVs trazem tudo em poucos arquivos.
// Uso: node scripts/build-machines.mjs

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT = fileURLToPath(new URL('../frontend/src/data/machines.json', import.meta.url));
const LEARNERS_DIR = fileURLToPath(new URL('../frontend/src/data/machine-learners/', import.meta.url));
const DAMAGE_CLASSES = { 1: 'status', 2: 'physical', 3: 'special' };
const MACHINE_METHOD_ID = '4';

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

const byId = (rows) => new Map(rows.map((row) => [row.id, row]));
const numberOrNull = (value) => (value === '' || value == null ? null : Number(value));

const [machines, moves, items, types, versionGroups, pokemonMoves] = await Promise.all(
  ['machines', 'moves', 'items', 'types', 'version_groups', 'pokemon_moves'].map(readCsv),
);

const moveById = byId(moves);
const itemById = byId(items);
const typeById = byId(types);
const groupById = byId(versionGroups);

const games = {};
const moveIndex = {};

for (const machine of machines) {
  const group = groupById.get(machine.version_group_id)?.identifier;
  const move = moveById.get(machine.move_id);
  const item = itemById.get(machine.item_id)?.identifier;
  if (!group || !move || !item) continue;

  (games[group] ??= []).push([Number(machine.machine_number), item, move.identifier]);
  moveIndex[move.identifier] ??= [
    typeById.get(move.type_id)?.identifier ?? null,
    DAMAGE_CLASSES[move.damage_class_id] ?? null,
    numberOrNull(move.power),
    numberOrNull(move.accuracy),
  ];
}

// O número da máquina é contínuo entre TMs e HMs (HM01 vem depois do último TM), o que já dá a ordem de exibição.
for (const group of Object.keys(games)) {
  games[group] = games[group].sort((a, b) => a[0] - b[0]).map(([, item, move]) => [item, move]);
}

await writeFile(OUTPUT, `${JSON.stringify({ games, moves: moveIndex })}\n`);

// Só os jogos com máquinas; um jogo sem nenhum aprendizado por máquina na PokéAPI fica sem arquivo.
const learners = {};
for (const row of pokemonMoves) {
  if (row.pokemon_move_method_id !== MACHINE_METHOD_ID) continue;
  const group = groupById.get(row.version_group_id)?.identifier;
  const move = moveById.get(row.move_id)?.identifier;
  if (!games[group] || !move) continue;
  ((learners[group] ??= {})[move] ??= new Set()).add(Number(row.pokemon_id));
}

await rm(LEARNERS_DIR, { recursive: true, force: true });
await mkdir(LEARNERS_DIR, { recursive: true });
for (const [group, byMove] of Object.entries(learners)) {
  const sorted = Object.fromEntries(
    Object.entries(byMove).map(([move, ids]) => [move, [...ids].sort((a, b) => a - b)]),
  );
  await writeFile(`${LEARNERS_DIR}${group}.json`, `${JSON.stringify(sorted)}\n`);
}

const total = Object.values(games).reduce((sum, list) => sum + list.length, 0);
console.log(`${total} máquinas em ${Object.keys(games).length} jogos, ${Object.keys(moveIndex).length} golpes → ${OUTPUT}`);
console.log(`aprendizado por máquina: ${Object.keys(learners).length} jogos → ${LEARNERS_DIR}`);
