// Gera frontend/src/data/items.json a partir dos CSVs oficiais da PokéAPI: cada item com a categoria e o bolso.
// Pela API REST a categoria de um item só vem pedindo cada categoria (mais de 50 requisições por visita).
// Uso: node scripts/build-items.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT = fileURLToPath(new URL('../frontend/src/data/items.json', import.meta.url));

// Os cristais Z aparecem duas vezes ("-z--held" e "-z--bag"); fica só o segurado, sem o sufixo.
const HELD_SUFFIX = /--held$/;
const isBagCopy = (name) => name.endsWith('--bag');

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

const [items, categories, pockets] = await Promise.all(['items', 'item_categories', 'item_pockets'].map(readCsv));

const pocketName = new Map(pockets.map((pocket) => [pocket.id, pocket.identifier]));
const categoryList = categories.map((category) => [category.identifier, pocketName.get(category.pocket_id) ?? null]);
const categoryIndex = new Map(categories.map((category, index) => [category.id, index]));

// A PokéAPI repete alguns itens (Roseli Berry); cada nome entra uma vez só, com o menor id.
const byName = new Map();
for (const item of [...items].sort((a, b) => Number(a.id) - Number(b.id))) {
  const name = item.identifier.replace(HELD_SUFFIX, '');
  if (isBagCopy(item.identifier) || byName.has(name) || !categoryIndex.has(item.category_id)) continue;
  byName.set(name, [Number(item.id), name, categoryIndex.get(item.category_id)]);
}

// { categories: [[categoria, bolso]], items: [[id, nome, índice da categoria]] }, os itens por id.
const output = { categories: categoryList, items: [...byName.values()] };

await writeFile(OUTPUT, `${JSON.stringify(output)}\n`);
console.log(`items.json: ${output.items.length} itens em ${categoryList.length} categorias → ${OUTPUT}`);
