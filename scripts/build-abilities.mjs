// Gera frontend/src/data/abilities.json a partir dos CSVs oficiais da PokéAPI: as habilidades dos jogos principais,
// com o efeito curto (a PokéAPI não tem português; fica o inglês) e quem tem cada uma, marcando a oculta.
// Pela API REST seriam mais de 300 pedidos; os CSVs trazem tudo de uma vez.
// Uso: node scripts/build-abilities.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT = fileURLToPath(new URL('../frontend/src/data/abilities.json', import.meta.url));
const ENGLISH = '9';

// Os textos têm vírgulas e quebras de linha entre aspas: um split por vírgula não basta.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

async function readCsv(name) {
  const response = await fetch(`${CSV_BASE}/${name}.csv`);
  if (!response.ok) throw new Error(`${response.status} ${name}.csv`);
  const [columns, ...lines] = parseCsv(await response.text());
  return lines
    .filter((values) => values.length === columns.length)
    .map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index]])));
}

// "Raises Speed by one stage\nafter each turn." → uma linha só.
const oneLine = (text) => text.replace(/\s+/g, ' ').trim();

const [abilities, prose, pokemonAbilities] = await Promise.all(['abilities', 'ability_prose', 'pokemon_abilities'].map(readCsv));

const effectOf = new Map(
  prose.filter((row) => row.local_language_id === ENGLISH).map((row) => [row.ability_id, oneLine(row.short_effect)]),
);

// [id do Pokémon, 1 se oculta]; o mesmo Pokémon não repete a habilidade.
const holdersOf = new Map();
for (const { pokemon_id: pokemonId, ability_id: abilityId, is_hidden: hidden } of pokemonAbilities) {
  const holders = holdersOf.get(abilityId) ?? [];
  if (!holders.some(([id]) => id === Number(pokemonId))) holders.push([Number(pokemonId), Number(hidden)]);
  holdersOf.set(abilityId, holders);
}

// [slug, geração, efeito curto em inglês, [[id do Pokémon, oculta], ...]], em ordem alfabética.
const list = abilities
  .filter((ability) => ability.is_main_series === '1' && holdersOf.has(ability.id))
  .map((ability) => [
    ability.identifier,
    Number(ability.generation_id),
    effectOf.get(ability.id) ?? '',
    holdersOf.get(ability.id).sort((a, b) => a[0] - b[0]),
  ])
  .sort((a, b) => a[0].localeCompare(b[0]));

await writeFile(OUTPUT, `${JSON.stringify(list)}\n`);
console.log(`abilities.json: ${list.length} habilidades → ${OUTPUT}`);
