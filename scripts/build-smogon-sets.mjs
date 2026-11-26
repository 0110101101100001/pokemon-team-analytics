// Divide frontend/src/data/gen9.json (~1 MB, as builds da Smogon de todos os Pokémon) em
// frontend/public/data/smogon-sets/<arquivo>.json, um por Pokémon, mais index.json com os nomes da Smogon.
// Abrir as builds de um Pokémon baixa só o arquivo dele; o filtro "com builds" e o export para o Showdown
// só precisam do índice. O esboço de times continua lendo gen9.json inteiro (ele percorre todo o meta).
// O nome do arquivo sai de smogonSetFile, a mesma função que o site usa (frontend/src/utils/smogonSetFile.js).
// Uso: node scripts/build-smogon-sets.mjs (depois de trocar o gen9.json).

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { smogonSetFile } from '../frontend/src/utils/smogonSetFile.js';

const SOURCE = fileURLToPath(new URL('../frontend/src/data/gen9.json', import.meta.url));
const OUTPUT_DIR = fileURLToPath(new URL('../frontend/public/data/smogon-sets/', import.meta.url));

const all = JSON.parse(await readFile(SOURCE, 'utf8'));
const names = Object.keys(all);

const byFile = new Map();
for (const name of names) {
  const file = smogonSetFile(name);
  if (byFile.has(file)) throw new Error(`"${name}" e "${byFile.get(file)}" dariam o mesmo arquivo (${file}.json)`);
  byFile.set(file, name);
}

await rm(OUTPUT_DIR, { recursive: true, force: true });
await mkdir(OUTPUT_DIR, { recursive: true });
for (const [file, name] of byFile) {
  await writeFile(`${OUTPUT_DIR}${file}.json`, `${JSON.stringify(all[name])}\n`);
}
await writeFile(`${OUTPUT_DIR}index.json`, `${JSON.stringify(names)}\n`);
console.log(`${names.length} Pokémon → ${OUTPUT_DIR}`);
