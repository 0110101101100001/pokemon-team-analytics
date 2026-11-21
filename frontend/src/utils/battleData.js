// Atributos base, peso e golpes de src/data/battle-data.json (gerado por scripts/build-battle-data.mjs).
// As funções recebem o objeto já carregado, para rodarem também no Worker e nos testes.

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

let request = null;

/** ~90 KB baixados à parte, uma vez, quando o esboço precisa deles. */
export function loadBattleData() {
  request ??= import('../data/battle-data.json').then((module) => module.default).catch((error) => {
    request = null;
    throw error;
  });
  return request;
}

/** { hp, atk, def, spa, spd, spe } do Pokémon (id da PokéAPI), ou null. */
export function baseStatsOf(data, id) {
  const values = data.stats[id];
  return values ? Object.fromEntries(STAT_KEYS.map((key, index) => [key, values[index]])) : null;
}

/** Peso em kg do Pokémon (id da PokéAPI), ou null. */
export const weightOf = (data, id) => data.weights?.[id] ?? null;

/** O mesmo formato de fetchMoveSummary, ou null se o golpe não existir. */
export function moveSummaryOf(data, slug) {
  const entry = data.moves[slug];
  if (!entry) return null;
  const [type, damageClass, power, priority, effectChance, minHits, maxHits] = entry;
  return {
    slug,
    type,
    damageClass,
    power,
    priority,
    effectChance,
    ...(maxHits > 1 && { minHits, maxHits }),
  };
}
