// Gera frontend/src/data/megas.json a partir dos CSVs oficiais da PokéAPI: cada Mega e Primal com a forma base,
// a pedra, a geração de estreia, tipos, habilidade e atributos (os da forma base ao lado, para a diferença).
// A PokéAPI não liga a pedra à forma; a ligação é pelo nome ("charizardite-x" → "charizard-mega-x"),
// e o script falha se alguma pedra ou Mega ficar sem par.
// Uso: node scripts/build-megas.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT = fileURLToPath(new URL('../frontend/src/data/megas.json', import.meta.url));
const MEGA_STONES_CATEGORY = 'mega-stones';

// Formas que não usam pedra Mega: os Primais usam os orbes; a Mega Rayquaza, o golpe Dragon Ascent.
const NON_STONE = { 'kyogre-primal': 'blue-orb', 'groudon-primal': 'red-orb', 'rayquaza-mega': null };
const MIN_SHARED_PREFIX = 4;

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

const [pokemon, forms, versionGroups, stats, types, pokemonTypes, abilities, pokemonAbilities, items, itemCategories] =
  await Promise.all([
    'pokemon', 'pokemon_forms', 'version_groups', 'pokemon_stats', 'types', 'pokemon_types', 'abilities',
    'pokemon_abilities', 'items', 'item_categories',
  ].map(readCsv));

const byIdentifier = new Map(pokemon.map((row) => [row.identifier, row]));
const defaultBySpecies = new Map(pokemon.filter((row) => row.is_default === '1').map((row) => [row.species_id, row]));
const generationOfGroup = new Map(versionGroups.map((row) => [row.id, Number(row.generation_id)]));
const debutByPokemon = new Map(forms.map((row) => [row.pokemon_id, generationOfGroup.get(row.introduced_in_version_group_id)]));
const typeName = new Map(types.map((row) => [row.id, row.identifier]));
const abilityName = new Map(abilities.map((row) => [row.id, row.identifier]));

const groupBy = (rows, key) => rows.reduce((map, row) => map.set(row[key], [...(map.get(row[key]) ?? []), row]), new Map());
const statsOf = groupBy(stats, 'pokemon_id');
const typesOf = groupBy(pokemonTypes, 'pokemon_id');
const abilitiesOf = groupBy(pokemonAbilities, 'pokemon_id');

// Algumas Megas novas ainda vêm incompletas da PokéAPI: o que faltar fica vazio (null na ficha).
const baseStats = (id) => [...(statsOf.get(id) ?? [])].sort((a, b) => a.stat_id - b.stat_id).map((row) => Number(row.base_stat));
const typeList = (id) => [...(typesOf.get(id) ?? [])].sort((a, b) => a.slot - b.slot).map((row) => typeName.get(row.type_id));
const abilityList = (id) => [...(abilitiesOf.get(id) ?? [])].sort((a, b) => a.slot - b.slot).map((row) => abilityName.get(row.ability_id));

const megaCategory = itemCategories.find((row) => row.identifier === MEGA_STONES_CATEGORY).id;
const stones = items.filter((row) => row.category_id === megaCategory).map((row) => row.identifier);

// "charizard-mega-x" → variante "x"; "absolite-z" → "z"; sem letra, "".
const variantOf = (name) => name.match(/-([xyz])$/)?.[1] ?? '';
const sharedPrefix = (a, b) => {
  let length = 0;
  while (length < a.length && a[length] === b[length]) length += 1;
  return length;
};

function stoneFor(megaName, speciesName) {
  if (megaName in NON_STONE) return NON_STONE[megaName];
  const variant = variantOf(megaName);
  const candidates = stones
    .filter((stone) => variantOf(stone) === variant)
    .map((stone) => ({ stone, shared: sharedPrefix(stone, speciesName) }))
    .sort((a, b) => b.shared - a.shared);
  const [best] = candidates;
  if (!best || best.shared < MIN_SHARED_PREFIX) throw new Error(`Sem pedra para ${megaName}`);
  return best.stone;
}

const isMega = (name) => /-mega(-|$)/.test(name) || name.endsWith('-primal');

const megas = pokemon
  .filter((row) => isMega(row.identifier))
  .map((row) => {
    const species = defaultBySpecies.get(row.species_id);
    // A forma de origem quando ela existe ("meowstic-female-mega" → "meowstic-female"); senão, a padrão da espécie.
    const baseName = row.identifier.replace(/-(mega(-[xyz])?|primal)$/, '');
    const base = byIdentifier.get(baseName) ?? species;
    const speciesName = species.identifier.split('-')[0];
    return {
      name: row.identifier,
      id: Number(row.id),
      base: base.identifier,
      baseId: Number(base.id),
      stone: stoneFor(row.identifier, speciesName),
      generation: debutByPokemon.get(row.id) ?? null,
      types: typeList(row.id),
      baseTypes: typeList(base.id),
      ability: abilityList(row.id)[0] ?? null,
      stats: baseStats(row.id),
      baseStats: baseStats(base.id),
    };
  })
  .sort((a, b) => a.baseId - b.baseId || a.id - b.id);

const used = new Set(megas.map((mega) => mega.stone));
const unused = stones.filter((stone) => !used.has(stone));
if (unused.length) throw new Error(`Pedras sem Mega: ${unused.join(', ')}`);

await writeFile(OUTPUT, `${JSON.stringify(megas)}\n`);
console.log(`megas.json: ${megas.length} formas, ${stones.length} pedras → ${OUTPUT}`);
