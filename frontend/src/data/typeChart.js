// Tabela de tipos da geração atual (Gen 6 em diante, com Fairy): fonte única do site. A Pokédex (ficha), o Team
// Builder, o esboço, a calculadora de dano e a página Tipos leem daqui; nenhuma outra tela guarda a tabela.

/** Os 18 tipos, na ordem oficial dos jogos. */
export const TYPE_NAMES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

/** Abreviação de 3 letras de cada tipo, para cabeçalhos estreitos. */
export const TYPE_ABBREVIATIONS = {
  normal: 'NOR', fire: 'FIR', water: 'WAT', electric: 'ELE', grass: 'GRA', ice: 'ICE',
  fighting: 'FIG', poison: 'POI', ground: 'GRO', flying: 'FLY', psychic: 'PSY', bug: 'BUG',
  rock: 'ROC', ghost: 'GHO', dragon: 'DRA', dark: 'DAR', steel: 'STE', fairy: 'FAI',
};

// Tipo atacante → defensores com multiplicador diferente de 1.
const RELATIONS = {
  normal: { half: ['rock', 'steel'], zero: ['ghost'] },
  fire: { double: ['grass', 'ice', 'bug', 'steel'], half: ['fire', 'water', 'rock', 'dragon'] },
  water: { double: ['fire', 'ground', 'rock'], half: ['water', 'grass', 'dragon'] },
  electric: { double: ['water', 'flying'], half: ['electric', 'grass', 'dragon'], zero: ['ground'] },
  grass: { double: ['water', 'ground', 'rock'], half: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'] },
  ice: { double: ['grass', 'ground', 'flying', 'dragon'], half: ['fire', 'water', 'ice', 'steel'] },
  fighting: { double: ['normal', 'ice', 'rock', 'dark', 'steel'], half: ['poison', 'flying', 'psychic', 'bug', 'fairy'], zero: ['ghost'] },
  poison: { double: ['grass', 'fairy'], half: ['poison', 'ground', 'rock', 'ghost'], zero: ['steel'] },
  ground: { double: ['fire', 'electric', 'poison', 'rock', 'steel'], half: ['grass', 'bug'], zero: ['flying'] },
  flying: { double: ['grass', 'fighting', 'bug'], half: ['electric', 'rock', 'steel'] },
  psychic: { double: ['fighting', 'poison'], half: ['psychic', 'steel'], zero: ['dark'] },
  bug: { double: ['grass', 'psychic', 'dark'], half: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'] },
  rock: { double: ['fire', 'ice', 'flying', 'bug'], half: ['fighting', 'ground', 'steel'] },
  ghost: { double: ['psychic', 'ghost'], half: ['dark'], zero: ['normal'] },
  dragon: { double: ['dragon'], half: ['steel'], zero: ['fairy'] },
  dark: { double: ['psychic', 'ghost'], half: ['fighting', 'dark', 'fairy'] },
  steel: { double: ['ice', 'rock', 'fairy'], half: ['fire', 'water', 'electric', 'steel'] },
  fairy: { double: ['fighting', 'dragon', 'dark'], half: ['fire', 'poison', 'steel'] },
};

const VALUES = { double: 2, half: 0.5, zero: 0 };

/** Matriz completa ataque → defesa: TYPE_CHART.fire.grass === 2. Todos os 18 × 18 valores (0, 0.5, 1 ou 2). */
export const TYPE_CHART = Object.freeze(Object.fromEntries(TYPE_NAMES.map((attack) => {
  const row = Object.fromEntries(TYPE_NAMES.map((defense) => [defense, 1]));
  for (const [kind, targets] of Object.entries(RELATIONS[attack])) {
    for (const target of targets) row[target] = VALUES[kind];
  }
  return [attack, Object.freeze(row)];
})));

export const isTypeName = (value) => Object.hasOwn(TYPE_CHART, value);

/**
 * Multiplicador de um ataque do tipo `attackType` contra um defensor de 1 ou 2 tipos (o produto dos dois).
 * Tipo desconhecido (como "stellar" ou "???") conta como neutro.
 */
export function effectiveness(attackType, defenderTypes) {
  const row = TYPE_CHART[attackType];
  if (!row) return 1;
  return defenderTypes.reduce((total, type) => total * (row[type] ?? 1), 1);
}

/** Tipos atacantes agrupados pelo dano que um defensor de `types` recebe: { x4, x2, x1, x05, x025, x0 }. */
export function defensiveProfile(types) {
  const profile = { x4: [], x2: [], x1: [], x05: [], x025: [], x0: [] };
  const key = { 4: 'x4', 2: 'x2', 1: 'x1', 0.5: 'x05', 0.25: 'x025', 0: 'x0' };
  for (const attack of TYPE_NAMES) profile[key[effectiveness(attack, types)]].push(attack);
  return profile;
}

/** O que um ataque de `type` faz em cada tipo: { superEffective, notVery, noEffect } (os neutros ficam de fora). */
export function offensiveProfile(type) {
  const row = TYPE_CHART[type] ?? {};
  const pick = (value) => TYPE_NAMES.filter((defense) => row[defense] === value);
  return { superEffective: pick(2), notVery: pick(0.5), noEffect: pick(0) };
}
