// Gera frontend/src/data/pokedex-index.json a partir dos CSVs oficiais da PokéAPI.
// É o que a grade precisa para abrir: variedades, espécies, tipos e grupos de ovos.
// Pela API REST isso custa mais de 40 requisições (e vários MB) a cada visita.
// Uso: node scripts/build-pokedex-index.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT = fileURLToPath(new URL('../frontend/src/data/pokedex-index.json', import.meta.url));
// Mesmo corte da grade (DEX_SIZE em frontend/src/utils/pokedex.js).
const DEX_SIZE = 1025;
// Ids ≥ 10000 de tipos são "unknown"/"shadow"/"stellar", fora da tabela de tipos.
const MAIN_TYPE_MAX_ID = 10000;

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

const [pokemon, species, pokemonTypes, types, eggGroups, pokemonEggGroups] = await Promise.all(
  ['pokemon', 'pokemon_species', 'pokemon_types', 'types', 'egg_groups', 'pokemon_egg_groups'].map(readCsv),
);

const byId = (a, b) => a[0] - b[0];
const typeName = new Map(
  types.filter((t) => Number(t.id) < MAIN_TYPE_MAX_ID).map((t) => [t.id, t.identifier]),
);

const typesByPokemon = {};
for (const { pokemon_id: id, type_id: typeId, slot } of pokemonTypes) {
  const name = typeName.get(typeId);
  if (!name) continue;
  (typesByPokemon[id] ??= [])[Number(slot) - 1] = name;
}

const groupOrder = eggGroups.map((g) => Number(g.id)).sort((a, b) => a - b);
const groupIndex = new Map(groupOrder.map((id, index) => [String(id), index]));
const groupsBySpecies = {};
for (const { species_id: id, egg_group_id: groupId } of pokemonEggGroups) {
  (groupsBySpecies[id] ??= []).push(groupIndex.get(groupId));
}
for (const groups of Object.values(groupsBySpecies)) groups.sort((a, b) => a - b);

const index = {
  pokemon: pokemon.map((p) => [Number(p.id), p.identifier]).sort(byId),
  species: species
    .map((s) => [Number(s.id), s.identifier])
    .filter(([id]) => id <= DEX_SIZE)
    .sort(byId),
  types: typesByPokemon,
  eggGroups: {
    names: groupOrder.map((id) => eggGroups.find((g) => Number(g.id) === id).identifier),
    bySpecies: groupsBySpecies,
  },
};

await writeFile(OUTPUT, `${JSON.stringify(index)}\n`);
console.log(
  `pokedex-index.json: ${index.pokemon.length} variedades, ${index.species.length} espécies, ` +
    `${index.eggGroups.names.length} grupos de ovos`,
);
