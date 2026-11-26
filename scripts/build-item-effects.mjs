// Gera frontend/public/data/item-effects.json: { "<nome do item>": "efeito resumido" }, para a aba Itens em modo Lista.
// Pela API REST seria um pedido por item; os CSVs da PokéAPI trazem todos de uma vez. O texto é o short_effect em
// inglês e, para os itens sem ele (a maioria dos itens novos), a descrição do jogo mais recente, também em inglês:
// a PokéAPI não tem esses textos em português. São os mesmos textos que o modal do item mostra.
// Os nomes seguem build-items.mjs (cristais Z sem o sufixo "--held", cópias "--bag" fora).
// Uso: node scripts/build-item-effects.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const OUTPUT = fileURLToPath(new URL('../frontend/public/data/item-effects.json', import.meta.url));
const ENGLISH = '9';

const HELD_SUFFIX = /--held$/;
const isBagCopy = (name) => name.endsWith('--bag');

/** CSV com campos entre aspas que podem ter vírgulas, aspas dobradas e quebras de linha (os textos de item têm). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...lines] = rows;
  return lines.filter((line) => line.length > 1).map((line) => Object.fromEntries(header.map((column, index) => [column, line[index] ?? ''])));
}

async function readCsv(name) {
  const response = await fetch(`${CSV_BASE}/${name}.csv`);
  if (!response.ok) throw new Error(`${response.status} ${name}.csv`);
  return parseCsv(await response.text());
}

// Os textos têm links da PokéAPI: "[HP]{mechanic:hp}" vira "HP"; "[]{move:thunder}" (rótulo vazio) vira "thunder".
const cleanProse = (text) =>
  text
    .replace(/\[([^\]]*)\]\{[^:}]+:([^}]+)\}/g, (_, label, slug) => label || slug.replace(/-/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const [items, prose, flavorTexts, versionGroups] = await Promise.all(
  ['items', 'item_prose', 'item_flavor_text', 'version_groups'].map(readCsv),
);
const nameById = new Map(
  items.filter((item) => !isBagCopy(item.identifier)).map((item) => [item.id, item.identifier.replace(HELD_SUFFIX, '')]),
);

const effects = {};
for (const entry of prose) {
  const name = nameById.get(entry.item_id);
  if (entry.local_language_id !== ENGLISH || !name || effects[name] || !entry.short_effect) continue;
  effects[name] = cleanProse(entry.short_effect);
}

// Sem short_effect: a descrição do jogo mais recente (pela ordem dos version groups).
const groupOrder = new Map(versionGroups.map((group) => [group.id, Number(group.order)]));
const latestFlavor = new Map();
for (const entry of flavorTexts) {
  const name = nameById.get(entry.item_id);
  if (entry.language_id !== ENGLISH || !name || effects[name] || !entry.flavor_text.trim()) continue;
  const order = groupOrder.get(entry.version_group_id) ?? 0;
  if ((latestFlavor.get(name)?.order ?? -1) < order) latestFlavor.set(name, { order, text: entry.flavor_text });
}
for (const [name, { text }] of latestFlavor) effects[name] = cleanProse(text.replace(/\u00ad/g, ''));

await writeFile(OUTPUT, `${JSON.stringify(effects)}\n`);
console.log(`item-effects.json: ${Object.keys(effects).length} itens → ${OUTPUT}`);
