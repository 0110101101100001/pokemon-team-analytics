// Restaura uma tabela a partir de backups/<tabela>.json.gz pela API REST (upsert pela chave primária).
// Linhas que existem no banco e não no backup não são apagadas.
//
// Uso: SUPABASE_URL=... SUPABASE_KEY=<service_role> node scripts/restore-supabase.mjs <tabela> [arquivo]
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const BATCH_SIZE = 500;
// Colunas geradas pelo banco: o Postgres recusa valores nelas.
const GENERATED = { smogon_stats: ['name_key'] };

const [table, file = `backups/${table}.json.gz`] = process.argv.slice(2);
const { SUPABASE_URL: url, SUPABASE_KEY: key } = process.env;
if (!table || !url || !key) {
  console.error('Uso: SUPABASE_URL=... SUPABASE_KEY=... node scripts/restore-supabase.mjs <tabela> [arquivo]');
  process.exit(1);
}

const omit = new Set(GENERATED[table] ?? []);
const rows = JSON.parse(gunzipSync(readFileSync(file)).toString('utf8'))
  .map((row) => Object.fromEntries(Object.entries(row).filter(([column]) => !omit.has(column))));

for (let start = 0; start < rows.length; start += BATCH_SIZE) {
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows.slice(start, start + BATCH_SIZE)),
  });
  if (!response.ok) {
    console.error(`${table}: lote a partir da linha ${start} falhou (${response.status}): ${await response.text()}`);
    process.exit(1);
  }
}
console.log(`${table}: ${rows.length} linhas restauradas de ${file}`);
