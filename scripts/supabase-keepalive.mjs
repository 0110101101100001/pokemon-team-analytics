import { pathToFileURL } from 'node:url';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function pingSupabase({
  url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_KEY,
  table = process.env.SUPABASE_PING_TABLE ?? 'smogon_stats',
  timeoutMs = 10_000,
} = {}) {
  if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_KEY são obrigatórios');

  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    method: 'HEAD',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=estimated' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error(`Ping falhou: ${res.status} ${res.statusText}`);
  return res.headers.get('content-range');
}

export function startSupabaseKeepAlive({ intervalMs = DAY_MS, ...options } = {}) {
  const tick = () =>
    pingSupabase(options)
      .then((range) => console.log(`[keepalive] ok ${range ?? ''}`))
      .catch((err) => console.error(`[keepalive] ${err.message}`));

  tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  pingSupabase()
    .then((range) => console.log(`[keepalive] ok ${range ?? ''}`))
    .catch((err) => {
      console.error(`[keepalive] ${err.message}`);
      process.exit(1);
    });
}
