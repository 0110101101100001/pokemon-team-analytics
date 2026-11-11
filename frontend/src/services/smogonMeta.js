import { supabase } from './supabase';

const TABLE = 'smogon_stats';
const cache = new Map();

async function loadTierMeta(tier) {
  const latest = await supabase
    .from(TABLE)
    .select('date')
    .eq('tier', tier)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) throw latest.error;
  if (!latest.data) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select('name, usage_percent, teammates, checks_and_counters')
    .eq('tier', tier)
    .eq('date', latest.data.date);
  if (error) throw error;
  return data;
}

/**
 * Uso, companheiros e counters de todos os Pokémon de um tier, no mês mais recente.
 * Uma consulta por tier por sessão; uma falha não fica em cache.
 */
export function fetchSmogonMeta(tier) {
  if (!cache.has(tier)) {
    cache.set(tier, loadTierMeta(tier).catch((error) => {
      cache.delete(tier);
      throw error;
    }));
  }
  return cache.get(tier);
}
