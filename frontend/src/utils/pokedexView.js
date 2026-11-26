// Ordenação e modo de exibição da Pokédex (Grade/Lista): valores aceitos, leitura da URL e do navegador, e a
// ordenação em si. Sem React, para os testes.
import { formatSlug } from './filters';

export const VIEW_STORAGE_KEY = 'smearglepedia-pokedex-view';
export const SORT_PARAM = 'sort';
export const VIEW_PARAM = 'view';

export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const STAT_LABELS = { hp: 'HP', atk: 'Ataque', def: 'Defesa', spa: 'Sp. Atq', spd: 'Sp. Def', spe: 'Velocidade' };
export const STAT_SHORT = { hp: 'HP', atk: 'Atq', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Vel' };

// `stat`: a ordenação usa atributos base (baixados à parte, em public/data/base-stats.json).
export const SORTS = [
  { value: 'number', label: 'Nº' },
  { value: 'name', label: 'Nome A–Z' },
  { value: 'name-desc', label: 'Nome Z–A' },
  { value: 'total', label: 'Total de stats ↓', stat: 'total' },
  { value: 'hp', label: 'HP ↓', stat: 'hp' },
  { value: 'attack', label: 'Ataque ↓', stat: 'atk' },
  { value: 'defense', label: 'Defesa ↓', stat: 'def' },
  { value: 'sp-attack', label: 'Sp. Atq ↓', stat: 'spa' },
  { value: 'sp-defense', label: 'Sp. Def ↓', stat: 'spd' },
  { value: 'speed', label: 'Velocidade ↓', stat: 'spe' },
];
export const VIEWS = [
  { value: 'grid', label: 'Grade' },
  { value: 'list', label: 'Lista' },
];

export const DEFAULT_VIEW_STATE = Object.freeze({ sort: 'number', view: 'grid' });

const sortOf = (value) => SORTS.find((sort) => sort.value === value) ?? null;
export const isSort = (value) => Boolean(sortOf(value));
export const isView = (value) => VIEWS.some((view) => view.value === value);
export const sortNeedsStats = (sort) => Boolean(sortOf(sort)?.stat);

/** { sort, view } válidos a partir de valores soltos; o que for inválido vira o padrão. */
export function normalizeViewState(raw) {
  return {
    sort: isSort(raw?.sort) ? raw.sort : DEFAULT_VIEW_STATE.sort,
    view: isView(raw?.view) ? raw.view : DEFAULT_VIEW_STATE.view,
  };
}

/**
 * O que a URL define: cada parâmetro presente vale (e, se for inválido, vira o padrão); os ausentes ficam de fora
 * ({} sem nenhum), para valer a escolha guardada no navegador.
 */
export function viewStateFromParams(params) {
  const state = {};
  if (params.has(SORT_PARAM)) state.sort = isSort(params.get(SORT_PARAM)) ? params.get(SORT_PARAM) : DEFAULT_VIEW_STATE.sort;
  if (params.has(VIEW_PARAM)) state.view = isView(params.get(VIEW_PARAM)) ? params.get(VIEW_PARAM) : DEFAULT_VIEW_STATE.view;
  return state;
}

/** Parâmetros da URL com a ordenação e o modo: os padrões (e os inválidos) saem, o resto fica como estava. */
export function paramsWithViewState(params, state) {
  const next = new URLSearchParams(params);
  for (const [key, param] of [['sort', SORT_PARAM], ['view', VIEW_PARAM]]) {
    if (state[key] === DEFAULT_VIEW_STATE[key]) next.delete(param);
    else next.set(param, state[key]);
  }
  return next;
}

export function readStoredViewState(storage) {
  try {
    return normalizeViewState(JSON.parse(storage?.getItem(VIEW_STORAGE_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_VIEW_STATE };
  }
}

export function writeStoredViewState(storage, state) {
  try {
    storage?.setItem(VIEW_STORAGE_KEY, JSON.stringify(normalizeViewState(state)));
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): vale só nesta visita.
  }
}

/** { hp, atk, def, spa, spd, spe, total } de um id, a partir de base-stats.json ({ "<id>": [6 números] }). */
export function statsOf(baseStats, id) {
  const values = baseStats?.[id];
  if (!values) return null;
  const stats = Object.fromEntries(STAT_KEYS.map((key, index) => [key, values[index]]));
  stats.total = values.reduce((sum, value) => sum + value, 0);
  return stats;
}

const byNumber = (a, b) => a.number - b.number || a.id - b.id;
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const nameOf = (entry) => formatSlug(entry.name);

/**
 * A lista na ordem escolhida. 'number' devolve a própria lista: a ordem natural dela (a Pokédex, com as formas junto
 * da espécie, ou a ordem da coleção: favoritos e histórico do mais recente ao mais antigo).
 * Nas ordens por atributo, o maior vem primeiro e o empate segue o número; sem os atributos carregados
 * (`baseStats` null) ou sem dado do Pokémon, ele vai para o fim.
 */
export function sortEntries(list, sort, baseStats) {
  const option = sortOf(sort);
  if (!option || option.value === 'number') return list;
  if (option.value === 'name') return [...list].sort((a, b) => collator.compare(nameOf(a), nameOf(b)) || byNumber(a, b));
  if (option.value === 'name-desc') return [...list].sort((a, b) => collator.compare(nameOf(b), nameOf(a)) || byNumber(a, b));
  if (!baseStats) return list;
  const value = (entry) => statsOf(baseStats, entry.id)?.[option.stat] ?? -1;
  return [...list].sort((a, b) => value(b) - value(a) || byNumber(a, b));
}
