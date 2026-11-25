// Gera frontend/src/data/move-learners/<golpe>.json: como cada Pokémon aprende o golpe, somando todos os jogos.
// A lista de quem aprende vem de /move/{golpe} na PokéAPI, que não traz o método; o método só existe por Pokémon
// (/pokemon/{id}.moves), o que daria mais de mil requisições no navegador. Os CSVs oficiais trazem tudo de uma vez.
//
// Formato de cada arquivo: { "<id do Pokémon>": { l?, m?, mg?, e?, t?, o? } }
//   l  níveis em que aprende subindo de nível, sem repetir, em ordem (0 = ao evoluir)
//   m  máquina do jogo mais recente em que aprende por máquina ("TM 045", "HM 03", "TR 12"); mg = esse jogo
//   e  1 se aprende por ovo; t = 1 se aprende com tutor
//   o  outros métodos (relembrador, troca de forma, eventos de Colosseum/XD…), pelo identificador da PokéAPI
// Uso: node scripts/build-move-learners.mjs

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT_DIR = fileURLToPath(new URL('../frontend/src/data/move-learners/', import.meta.url));

// pokemon_move_methods.csv
const LEVEL_UP = '1';
const EGG = new Set(['2', '6']); // ovo e ovo com Light Ball (Pichu com Volt Tackle)
const TUTOR = '3';
const MACHINE = '4';

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

const [pokemonMoves, methods, moves, versionGroups, machines, items] = await Promise.all(
  ['pokemon_moves', 'pokemon_move_methods', 'moves', 'version_groups', 'machines', 'items'].map(readCsv),
);

const methodName = new Map(methods.map((row) => [row.id, row.identifier]));
const moveName = new Map(moves.map((row) => [row.id, row.identifier]));
const groups = new Map(versionGroups.map((row) => [row.id, { slug: row.identifier, order: Number(row.order) }]));
const itemName = new Map(items.map((row) => [row.id, row.identifier]));

// "tm045" → "TM 045", "hm03" → "HM 03", "tr12" → "TR 12": a numeração de cada jogo, como aparece nele.
function machineLabel(item) {
  const match = /^(tm|hm|tr)(\d+)$/.exec(item ?? '');
  return match ? `${match[1].toUpperCase()} ${match[2]}` : null;
}

const machineByGroupMove = new Map(
  machines.map((row) => [`${row.version_group_id}:${row.move_id}`, machineLabel(itemName.get(row.item_id))]),
);

// golpe → Pokémon → { levels: Set, machine: { order, label, group }, egg, tutor, other: Set }
const index = new Map();
for (const row of pokemonMoves) {
  const move = moveName.get(row.move_id);
  const group = groups.get(row.version_group_id);
  if (!move || !group) continue;
  const byPokemon = index.get(move) ?? new Map();
  index.set(move, byPokemon);
  const entry = byPokemon.get(row.pokemon_id) ?? { levels: new Set(), machine: null, egg: false, tutor: false, other: new Set() };
  byPokemon.set(row.pokemon_id, entry);

  const method = row.pokemon_move_method_id;
  if (method === LEVEL_UP) entry.levels.add(Number(row.level));
  else if (EGG.has(method)) entry.egg = true;
  else if (method === TUTOR) entry.tutor = true;
  else if (method === MACHINE) {
    const label = machineByGroupMove.get(`${row.version_group_id}:${row.move_id}`);
    if (!entry.machine || group.order > entry.machine.order) entry.machine = { order: group.order, label, group: group.slug };
  } else entry.other.add(methodName.get(method));
}

await rm(OUTPUT_DIR, { recursive: true, force: true });
await mkdir(OUTPUT_DIR, { recursive: true });
let bytes = 0;
for (const [move, byPokemon] of index) {
  const out = {};
  for (const [id, entry] of [...byPokemon].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const compact = {};
    if (entry.levels.size) compact.l = [...entry.levels].sort((a, b) => a - b);
    if (entry.machine) {
      compact.m = entry.machine.label ?? 'TM';
      compact.mg = entry.machine.group;
    }
    if (entry.egg) compact.e = 1;
    if (entry.tutor) compact.t = 1;
    if (entry.other.size) compact.o = [...entry.other].sort();
    out[id] = compact;
  }
  const json = `${JSON.stringify(out)}\n`;
  bytes += json.length;
  await writeFile(`${OUTPUT_DIR}${move}.json`, json);
}
console.log(`${index.size} golpes, ${(bytes / 1024 / 1024).toFixed(1)} MB → ${OUTPUT_DIR}`);
