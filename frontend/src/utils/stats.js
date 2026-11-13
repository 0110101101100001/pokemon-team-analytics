export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export const STAT_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

const POKEAPI_STAT_KEYS = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
};

/** `stats` de /pokemon → { hp, atk, def, spa, spd, spe }. */
export const toBaseStats = (pokeApiStats) =>
  Object.fromEntries(pokeApiStats.map(({ stat, base_stat: base }) => [POKEAPI_STAT_KEYS[stat.name], base]));

// [nome, atributo aumentado, atributo reduzido]; sem atributos = natureza neutra.
const NATURE_TABLE = [
  ['hardy'], ['lonely', 'atk', 'def'], ['brave', 'atk', 'spe'], ['adamant', 'atk', 'spa'], ['naughty', 'atk', 'spd'],
  ['bold', 'def', 'atk'], ['docile'], ['relaxed', 'def', 'spe'], ['impish', 'def', 'spa'], ['lax', 'def', 'spd'],
  ['timid', 'spe', 'atk'], ['hasty', 'spe', 'def'], ['serious'], ['jolly', 'spe', 'spa'], ['naive', 'spe', 'spd'],
  ['modest', 'spa', 'atk'], ['mild', 'spa', 'def'], ['quiet', 'spa', 'spe'], ['bashful'], ['rash', 'spa', 'spd'],
  ['calm', 'spd', 'atk'], ['gentle', 'spd', 'def'], ['sassy', 'spd', 'spe'], ['careful', 'spd', 'spa'], ['quirky'],
];

export const NATURES = NATURE_TABLE.map(([name, plus = null, minus = null]) => ({ name, plus, minus }));

const NATURE_BY_NAME = new Map(NATURES.map((nature) => [nature.name, nature]));

export const natureOf = (name) => NATURE_BY_NAME.get(name) ?? NATURES[0];

export const natureMultiplier = (nature, key) => {
  if (nature.plus === key) return 1.1;
  if (nature.minus === key) return 0.9;
  return 1;
};

export const MAX_EV = 252;
// O jogo aceita 510, mas só múltiplos de 4 viram pontos de atributo: 252 + 252 + 4 = 508 é o total útil.
export const MAX_EV_TOTAL = 508;
export const MAX_IV = 31;
export const MAX_LEVEL = 100;

const fill = (value) => Object.fromEntries(STAT_KEYS.map((key) => [key, value]));

const clamp = (value, min, max) => Math.min(Math.max(Math.trunc(Number(value)) || 0, min), max);

/** Set de batalha de um Pokémon recém-adicionado: nível 100, IVs máximos, sem EVs, natureza neutra. */
export const createBattleSet = () => ({
  level: MAX_LEVEL,
  nature: 'hardy',
  item: '',
  evs: fill(0),
  ivs: fill(MAX_IV),
  moves: [null, null, null, null],
});

/** Completa e saneia um set vindo do armazenamento (times salvos antes de existirem sets chegam sem ele). */
export function normalizeBattleSet(stored) {
  const base = createBattleSet();
  if (!stored || typeof stored !== 'object') return base;
  return {
    level: clamp(stored.level ?? base.level, 1, MAX_LEVEL),
    nature: NATURE_BY_NAME.has(stored.nature) ? stored.nature : base.nature,
    item: typeof stored.item === 'string' ? stored.item : '',
    evs: Object.fromEntries(STAT_KEYS.map((key) => [key, clamp(stored.evs?.[key], 0, MAX_EV)])),
    ivs: Object.fromEntries(STAT_KEYS.map((key) => [key, clamp(stored.ivs?.[key] ?? MAX_IV, 0, MAX_IV)])),
    moves: base.moves.map((_, index) => (stored.moves?.[index]?.slug ? stored.moves[index] : null)),
  };
}

export const evTotal = (evs) => STAT_KEYS.reduce((sum, key) => sum + evs[key], 0);

/** Limita um EV ao máximo por atributo e ao que ainda sobra do total de 510. */
export function clampEv(evs, key, value) {
  const available = MAX_EV_TOTAL - (evTotal(evs) - evs[key]);
  return clamp(value, 0, Math.min(MAX_EV, available));
}

export const clampIv = (value) => clamp(value, 0, MAX_IV);
export const clampLevel = (value) => clamp(value, 1, MAX_LEVEL);

/** Fórmula de atributos da Geração 3 em diante. */
export function calcStat(key, base, { level, iv, ev, nature }) {
  const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (key === 'hp') return base === 1 ? 1 : core + level + 10;
  return Math.floor((core + 5) * natureMultiplier(nature, key));
}

/** Os seis atributos finais de um set sobre os atributos base da espécie. */
export function calcStats(baseStats, set) {
  const nature = natureOf(set.nature);
  return Object.fromEntries(
    STAT_KEYS.map((key) => [key, calcStat(key, baseStats[key], { level: set.level, iv: set.ivs[key], ev: set.evs[key], nature })]),
  );
}
