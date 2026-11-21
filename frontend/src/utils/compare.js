import { STAT_KEYS } from './stats';

// Comparação de Pokémon: até quatro entradas da grade lado a lado.
export const COMPARE_LIMIT = 4;

/** Tira o Pokémon se já está na lista; senão, acrescenta no fim, enquanto houver vaga. */
export function toggleCompared(names, name) {
  if (names.includes(name)) return names.filter((candidate) => candidate !== name);
  return names.length < COMPARE_LIMIT ? [...names, name] : names;
}

export const statTotal = (stats) => STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);

/**
 * Maior valor de cada atributo (e do total) entre os Pokémon já carregados; empates marcam todos.
 * Com menos de dois carregados não há com quem comparar, e nada é destacado.
 */
export function statLeaders(statsList) {
  const loaded = statsList.filter(Boolean);
  if (loaded.length < 2) return {};
  const keys = [...STAT_KEYS, 'total'];
  const valueOf = (stats, key) => (key === 'total' ? statTotal(stats) : stats[key]);
  return Object.fromEntries(keys.map((key) => [key, Math.max(...loaded.map((stats) => valueOf(stats, key)))]));
}

// A Smogon agrupa o resto em "Other" e marca a falta de item como "Nothing".
const isPlaceholder = (name) => /^(nothing|other)$/i.test(name);

/** [nome, %] mais usado de um registro da Smogon (itens, habilidades), ou null. */
export function topUsage(record) {
  const [top] = Object.entries(record ?? {})
    .filter(([name]) => !isPlaceholder(name))
    .sort(([, a], [, b]) => b - a);
  return top ?? null;
}
