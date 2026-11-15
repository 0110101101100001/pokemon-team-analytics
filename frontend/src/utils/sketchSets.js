import { moveSummaryOf } from './battleData';
import { toPokeApiSlug } from './slug';
import { STAT_KEYS, TERA_TYPES, createBattleSet } from './stats';

export { toPokeApiSlug };

const MOVE_SLOTS = 4;
// Entradas agregadas da Smogon que não são um golpe, item ou habilidade de verdade.
const NOT_A_CHOICE = new Set(['Other', 'Nothing', '']);

// No JSON cada campo é um valor único, uma lista de alternativas ou está ausente; vale a primeira.
const firstOf = (value) => (Array.isArray(value) ? value[0] : value);

const movesFrom = (names, battleData) =>
  Array.from({ length: MOVE_SLOTS }, (_, index) => {
    const name = names[index];
    return name ? moveSummaryOf(battleData, toPokeApiSlug(name)) : null;
  });

const teraFrom = (name) => {
  const type = name?.toLowerCase();
  return TERA_TYPES.includes(type) ? type : null;
};

const ranked = (usage) => Object.entries(usage ?? {})
  .filter(([name]) => !NOT_A_CHOICE.has(name))
  .sort((a, b) => b[1] - a[1])
  .map(([name]) => name);

/**
 * Uma build de gen9.json → set de batalha, com a primeira alternativa de cada campo.
 * A Smogon omite a habilidade de quem só tem uma; aí vale a mais usada em `stat`, se houver.
 */
export function setFromBuild(raw, battleData, stat = null) {
  const base = createBattleSet();
  const evs = firstOf(raw.evs) ?? {};
  const item = firstOf(raw.item);
  const ability = firstOf(raw.ability) ?? ranked(stat?.abilities)[0];
  return {
    ...base,
    nature: firstOf(raw.nature)?.toLowerCase() ?? base.nature,
    item: item ? toPokeApiSlug(item) : '',
    ability: ability ? toPokeApiSlug(ability) : '',
    teraType: teraFrom(firstOf(raw.teratypes)),
    evs: Object.fromEntries(STAT_KEYS.map((key) => [key, Number(evs[key]) || 0])),
    moves: movesFrom((raw.moves ?? []).map(firstOf), battleData),
  };
}

/** "Jolly:0/252/0/0/4/252" → { nature: 'jolly', evs } */
function parseSpread(spread) {
  const [nature, values] = spread.split(':');
  const numbers = (values ?? '').split('/').map(Number);
  if (numbers.length !== STAT_KEYS.length || numbers.some(Number.isNaN)) return null;
  return { nature: nature.toLowerCase(), evs: Object.fromEntries(STAT_KEYS.map((key, i) => [key, numbers[i]])) };
}

/** Set mais provável pelos números de uso da Smogon: item, habilidade, spread e os 4 golpes mais usados. */
export function setFromUsage(stat, battleData) {
  const base = createBattleSet();
  const [item] = ranked(stat.items);
  const [ability] = ranked(stat.abilities);
  const spread = ranked(stat.spreads).map(parseSpread).find(Boolean);
  return {
    ...base,
    item: item ? toPokeApiSlug(item) : '',
    ability: ability ? toPokeApiSlug(ability) : '',
    ...(spread && { nature: spread.nature, evs: spread.evs }),
    moves: movesFrom(ranked(stat.moves), battleData),
  };
}

/**
 * Set mais provável de um Pokémon no tier: a primeira build de gen9.json (a ordem do arquivo é a preferida
 * da Smogon) ou, sem build, o uso em smogon_stats (`stat`). Sem nenhum dos dois, um set vazio.
 */
export function probableSet({ smogonName, tierKey, allSets, stat = null, battleData }) {
  const [build] = Object.values(allSets[smogonName]?.[tierKey] ?? {});
  if (build) return setFromBuild(build, battleData, stat);
  return stat ? setFromUsage(stat, battleData) : createBattleSet();
}
