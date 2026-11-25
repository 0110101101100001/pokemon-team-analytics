import { supabase } from './supabase';
import { withPersistentCache } from './persistentCache';

// Leituras públicas (RLS smogon_stats_public_read): vão direto ao Supabase,
// sem depender do backend no Render estar acordado.
const TABLE = 'smogon_stats';
const PAGE_SIZE = 1000;
const STATS_COLUMNS =
  'name, tier, date, raw_count, usage_percent, abilities, items, moves, spreads, tera_types, teammates, checks_and_counters';

// Tiers considerados para o selo "Smogon" da grade; tiers sem dados são ignorados.
const BADGE_TIERS = ['gen9ou', 'gen9ubers', 'gen9uu', 'gen9ru', 'gen9nu', 'gen9pu', 'gen9lc', 'gen9doublesou'];

// Os dados mudam uma vez por mês (smogon-sync.yml): as respostas ficam no IndexedDB por 24 h.
const DAY_MS = 24 * 60 * 60 * 1000;
const cached = (key, load) => withPersistentCache(`supabase:${TABLE}:${key}`, DAY_MS, load);

/** Guarda a promessa por chave durante a sessão; uma falha não fica em cache. */
function memoize(load) {
  const cache = new Map();
  return (key) => {
    if (!cache.has(key)) {
      cache.set(key, load(key).catch((error) => {
        cache.delete(key);
        throw error;
      }));
    }
    return cache.get(key);
  };
}

const latestDate = memoize(async (tier) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('date')
    .eq('tier', tier)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.date ?? null;
});

async function selectAllPages(buildQuery) {
  const rows = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

async function rowsAtLatest(tier, columns) {
  const date = await latestDate(tier);
  if (!date) return [];
  return selectAllPages(() =>
    supabase.from(TABLE).select(columns).eq('tier', tier).eq('date', date).order('name'));
}

/**
 * Uso, companheiros, counters, golpes, itens, habilidades e spreads de todos os Pokémon de um tier,
 * no mês mais recente.
 * Uma consulta por tier por sessão.
 */
export const fetchSmogonMeta = memoize((tier) => cached(`meta:${tier}`, () =>
  rowsAtLatest(tier, 'name, usage_percent, teammates, checks_and_counters, moves, items, abilities, spreads')));

// Uma folga sobre os 50 da tabela de velocidades: alguns nomes da Smogon não estão na Pokédex.
const TOP_USAGE_LIMIT = 60;

/** Os mais usados de um tier no mês mais recente, do mais ao menos usado, com spreads e itens. */
export const fetchTopUsage = memoize((tier) => cached(`top:${tier}`, async () => {
  const date = await latestDate(tier);
  if (!date) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('name, usage_percent, spreads, items')
    .eq('tier', tier)
    .eq('date', date)
    .order('usage_percent', { ascending: false })
    .limit(TOP_USAGE_LIMIT);
  if (error) throw error;
  return data;
}));

const smogonNames = memoize(() => cached('names', async () => {
  const perTier = await Promise.all(BADGE_TIERS.map((tier) => rowsAtLatest(tier, 'name')));
  return [...new Set(perTier.flat().map((row) => row.name))].sort();
}));

/** Nomes (formato Smogon) de todos os Pokémon com estatísticas em pelo menos um tier. */
export const fetchSmogonNames = () => smogonNames('all');

/**
 * Estatísticas de um Pokémon num tier; sem `date`, no mês mais recente desse Pokémon.
 * `name` é o nome exato na Smogon ("Urshifu-Rapid-Strike"), vindo de `resolveSmogonName`.
 */
export async function fetchSmogonStats(name, tier = 'gen9ou', { date, signal } = {}) {
  const data = await cached(`stats:${tier}:${name.toLowerCase()}:${date ?? 'latest'}`, () => queryStats(name, tier, { date, signal }));
  return data && {
    ...data,
    abilities: data.abilities ?? {},
    items: data.items ?? {},
    moves: data.moves ?? {},
    spreads: data.spreads ?? {},
    tera_types: data.tera_types ?? {},
    teammates: data.teammates ?? {},
    checks_and_counters: data.checks_and_counters ?? [],
  };
}

async function queryStats(name, tier, { date, signal }) {
  let query = supabase
    .from(TABLE)
    .select(STATS_COLUMNS)
    .eq('tier', tier)
    .eq('name_key', name.toLowerCase());
  if (date) query = query.eq('date', date);
  query = query.order('date', { ascending: false }).limit(1);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new Error(`Erro ao buscar estatísticas do Smogon (${error.message})`);
  }
  return data;
}
