// Gera, a partir dos CSVs oficiais da PokéAPI, os dados da aba Itens que a API REST só daria com centenas de pedidos:
// - frontend/src/data/evolution-items.json: por item, as evoluções que ele causa (usado, segurado na troca ou ao subir de nível);
// - frontend/src/data/berries.json: as Berries com sabor, firmeza, Natural Gift, crescimento e categoria.
// Uso: node scripts/build-item-data.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const outputOf = (name) => fileURLToPath(new URL(`../frontend/src/data/${name}`, import.meta.url));

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

const [
  evolutions, triggers, species, pokemon, forms, items, itemCategories, berries, firmness, berryFlavors, contestTypes, types,
] = await Promise.all([
  'pokemon_evolution', 'evolution_triggers', 'pokemon_species', 'pokemon', 'pokemon_forms', 'items', 'item_categories',
  'berries', 'berry_firmness', 'berry_flavors', 'contest_types', 'types',
].map(readCsv));

const byId = (rows) => new Map(rows.map((row) => [row.id, row]));
const itemById = byId(items);
const triggerById = byId(triggers);
const speciesById = byId(species);
const pokemonById = byId(pokemon);
const formById = byId(forms);
const categoryById = byId(itemCategories);
const defaultPokemonOf = new Map(pokemon.filter((row) => row.is_default === '1').map((row) => [row.species_id, row]));

/* ---------------------------------------------------------------- itens de evolução */

// A forma pedida tem prioridade (Vulpix de Alola + Ice Stone → Ninetales de Alola); senão, a forma padrão da espécie.
function pokemonFor(speciesId, formId) {
  const form = formId && formById.get(formId);
  const row = form ? pokemonById.get(form.pokemon_id) : defaultPokemonOf.get(speciesId);
  return row && { name: row.identifier, id: Number(row.id) };
}

const GENDERS = { 1: 'female', 2: 'male' };
const evolutionItems = {};
const seen = new Set();

for (const row of evolutions) {
  const itemId = row.trigger_item_id || row.held_item_id;
  if (!itemId) continue;
  const evolved = speciesById.get(row.evolved_species_id);
  const to = pokemonFor(row.evolved_species_id, row.evolved_pokemon_form_id);
  const from = pokemonFor(evolved.evolves_from_species_id, row.required_pokemon_form_id);
  if (!to || !from) continue;

  const entry = {
    from: from.name,
    fromId: from.id,
    to: to.name,
    toId: to.id,
    trigger: triggerById.get(row.evolution_trigger_id).identifier,
    held: Boolean(row.held_item_id),
    gender: GENDERS[row.gender_id] ?? null,
    timeOfDay: row.time_of_day || null,
  };
  const item = itemById.get(itemId).identifier;
  // A mesma evolução se repete por grupo de versões; fica uma só.
  const key = JSON.stringify([item, entry]);
  if (seen.has(key)) continue;
  seen.add(key);
  (evolutionItems[item] ??= []).push(entry);
}

/* ---------------------------------------------------------------- Berries */

// Os tipos de concurso da PokéAPI correspondem a um sabor cada.
const FLAVOR_OF_CONTEST = { cool: 'spicy', beauty: 'dry', cute: 'sweet', smart: 'bitter', tough: 'sour' };
const contestById = byId(contestTypes);
const typeById = byId(types);
const firmnessById = byId(firmness);
const flavorsOf = berryFlavors.reduce((map, row) => {
  const flavor = FLAVOR_OF_CONTEST[contestById.get(row.contest_type_id).identifier];
  return map.set(row.berry_id, { ...(map.get(row.berry_id) ?? {}), [flavor]: Number(row.flavor) });
}, new Map());

const berryList = berries
  .map((row) => {
    const item = itemById.get(row.item_id);
    return {
      name: item.identifier,
      id: Number(row.id),
      category: categoryById.get(item.category_id)?.identifier ?? null,
      firmness: firmnessById.get(row.firmness_id)?.identifier ?? null,
      naturalGift: { type: typeById.get(row.natural_gift_type_id)?.identifier ?? null, power: Number(row.natural_gift_power) },
      flavors: flavorsOf.get(row.id) ?? {},
      growthTime: Number(row.growth_time),
      size: Number(row.size),
      maxHarvest: Number(row.max_harvest),
    };
  })
  .sort((a, b) => a.id - b.id);

await writeFile(outputOf('evolution-items.json'), `${JSON.stringify(evolutionItems)}\n`);
await writeFile(outputOf('berries.json'), `${JSON.stringify(berryList)}\n`);
console.log(`evolution-items.json: ${Object.keys(evolutionItems).length} itens · berries.json: ${berryList.length} Berries`);
