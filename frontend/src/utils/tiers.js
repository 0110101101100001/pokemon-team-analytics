import { tierLabel } from './smogonSets';

// Formatos de singles com estatísticas na Smogon. Doubles fica de fora: a pontuação é de singles.
const SINGLES = [
  ['gen9ou', 'ou'],
  ['gen9ubers', 'ubers'],
  ['gen9uu', 'uu'],
  ['gen9ru', 'ru'],
  ['gen9nu', 'nu'],
  ['gen9pu', 'pu'],
  ['gen9lc', 'lc'],
];

/** [{ value: 'gen9ou', key: 'ou', label: 'OU' }]: `value` é o tier de smogon_stats; `key`, o de gen9.json. */
export const SINGLES_TIERS = SINGLES.map(([value, key]) => ({ value, key, label: tierLabel(key) }));

/** Nome do tier para exibir ("gen9ou" → "OU"); um valor desconhecido volta como veio. */
export const tierLabelOf = (tier) => SINGLES_TIERS.find((option) => option.value === tier)?.label ?? tier;

export const DEFAULT_TIER = 'gen9ou';

const KEY_BY_TIER = new Map(SINGLES);

/** 'gen9uu' → 'uu'. */
export const tierKeyOf = (tier) => KEY_BY_TIER.get(tier) ?? tier.replace(/^gen\d+/, '');

export const isSinglesTier = (tier) => KEY_BY_TIER.has(tier);
