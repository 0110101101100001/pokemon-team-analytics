// Gera frontend/public/data/base-stats.json: { "<id da PokéAPI>": [hp, atk, def, spa, spd, spe] } de todas as
// entradas da Pokédex, a partir de frontend/src/data/battle-data.json (que traz também golpes e pesos, ~100 KB).
// A Pokédex usa este índice (~37 KB) para ordenar por atributo e para a visualização em Lista.
// Uso: node scripts/build-base-stats.mjs (depois de rodar build-battle-data.mjs).

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SOURCE = fileURLToPath(new URL('../frontend/src/data/battle-data.json', import.meta.url));
const OUTPUT = fileURLToPath(new URL('../frontend/public/data/base-stats.json', import.meta.url));

const { stats } = JSON.parse(await readFile(SOURCE, 'utf8'));
await writeFile(OUTPUT, `${JSON.stringify(stats)}\n`);
console.log(`${Object.keys(stats).length} Pokémon → ${OUTPUT}`);
