// Backup das tabelas pela API REST do Supabase, com a chave service_role (secrets SUPABASE_URL e SUPABASE_KEY).
// Grava backups/<tabela>.json.gz (todas as colunas, em ordem fixa) e, quando pedido, backups/<tabela>.csv.
// A mesma tabela gera sempre os mesmos bytes: sem mudança nos dados, o workflow não comita nada.
//
// Uso: node scripts/backup-supabase.mjs [pasta]   (padrão: backups)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const PAGE_SIZE = 1000;

// `order`: coluna única que fixa a ordem das linhas entre execuções.
export const TABLES = [
  { name: 'PokemonTrainers', order: 'Card_ID', csv: true },
  { name: 'smogon_stats', order: 'id' },
];

function client({ url, key }) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  return async function request(table, { order, from, to }) {
    const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?select=*&order=${order}.asc`, {
      headers: { ...headers, Range: `${from}-${to}` },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
    return response.json();
  };
}

async function readAll(request, table, order) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await request(table, { order, from, to: from + PAGE_SIZE - 1 });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

// CSV como o PostgREST exporta: jsonb como JSON, nulo como campo vazio, aspas quando preciso.
export function toCsv(rows) {
  const columns = Object.keys(rows[0]);
  const cell = (value) => {
    if (value == null) return '';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.join(','), ...rows.map((row) => columns.map((column) => cell(row[column])).join(','))];
  return `${lines.join('\n')}\n`;
}

// Uma linha por registro: o JSON descompactado fica legível e comparável com diff.
const toJsonLines = (rows) => `[\n${rows.map((row) => JSON.stringify(row)).join(',\n')}\n]\n`;

export async function backup({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_KEY, dir = 'backups' } = {}) {
  if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_KEY são obrigatórios');
  const request = client({ url, key });
  mkdirSync(dir, { recursive: true });
  const summary = [];
  for (const { name, order, csv } of TABLES) {
    const rows = await readAll(request, name, order);
    if (rows.length === 0) throw new Error(`${name}: nenhuma linha; o backup anterior foi mantido`);
    // O gzip do Node grava mtime 0 no cabeçalho: mesmo conteúdo, mesmo arquivo.
    writeFileSync(join(dir, `${name}.json.gz`), gzipSync(toJsonLines(rows), { level: 9 }));
    if (csv) writeFileSync(join(dir, `${name}.csv`), toCsv(rows));
    summary.push(`${name}: ${rows.length} linhas`);
  }
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  backup({ dir: process.argv[2] })
    .then((summary) => console.log(summary.join('\n')))
    .catch((error) => {
      console.error(`[backup] ${error.message}`);
      process.exit(1);
    });
}
