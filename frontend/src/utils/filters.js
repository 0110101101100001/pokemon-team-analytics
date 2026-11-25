export const formatSlug = (slug) =>
  slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

export const filterKey = (filter) => `${filter.type}:${filter.value}`;

const DEX_QUERY = /^(?:#|n[º°o]\.?\s*)?(\d+)$/i;

/**
 * Converte o texto da pesquisa num predicado sobre as entradas da grade.
 * - Nome: "char", "mr mime" (espaços equivalem a hífens no slug).
 * - Número: "25", "#25", "Nº 25". Sem zeros à esquerda é prefixo (25 → 25, 250–259);
 *   com zeros à esquerda ("025") é o número exato. As formas compartilham o número da espécie.
 */
export function createSearchMatcher(rawTerm) {
  const term = rawTerm.trim().toLowerCase();
  if (!term) return null;

  const dex = term.match(DEX_QUERY);
  if (dex) {
    const digits = dex[1];
    if (digits.startsWith('0')) {
      const exact = Number(digits);
      return (p) => p.number === exact;
    }
    return (p) => String(p.number).startsWith(digits);
  }

  const slug = term.replace(/\s+/g, '-');
  return (p) => p.name.includes(slug);
}

/**
 * Predicado dos filtros ativos, sem a busca. Gerações, regiões e raridades: OR dentro do grupo; os demais: AND.
 * Filtros remotos ainda carregando (ou que falharam) são ignorados até terem o Set de ids. Null sem filtros.
 */
export function createFiltersMatcher(activeFilters, remoteFilterSets = {}) {
  if (activeFilters.length === 0) return null;
  const gens = new Set();
  const regions = new Set();
  const rarities = new Set();
  const types = [];
  const eggGroups = [];
  const idSets = [];
  const flags = [];
  for (const f of activeFilters) {
    if (f.type === 'generation') gens.add(Number(f.value));
    else if (f.type === 'region') regions.add(f.value);
    else if (f.type === 'rarity') rarities.add(f.value);
    else if (f.type === 'type') types.push(f.value);
    else if (f.type === 'eggGroup') eggGroups.push(f.value);
    else if (f.type === 'mega') flags.push(['hasMega', f.value === 'with']);
    else if (f.type === 'gmax') flags.push(['hasGmax', f.value === 'with']);
    else if (remoteFilterSets[filterKey(f)] instanceof Set) idSets.push(remoteFilterSets[filterKey(f)]);
  }
  return (p) =>
    (!gens.size || gens.has(p.generation)) &&
    (!regions.size || (p.region !== null && (regions.has('any') || regions.has(p.region)))) &&
    (!rarities.size || rarities.has(p.rarity ?? 'common')) &&
    types.every((t) => p.types.includes(t)) &&
    eggGroups.every((g) => p.eggGroups.includes(g)) &&
    flags.every(([flag, expected]) => p[flag] === expected) &&
    idSets.every((ids) => ids.has(p.id));
}

/**
 * Filtros e busca sobre a lista da grade. Com busca, os resultados vêm por relevância (ver `createSearch`)
 * e, dentro da mesma relevância, na ordem da lista.
 */
export function filterPokedex(list, { search = null, matchesFilters = null }) {
  if (!search && !matchesFilters) return list;
  if (!search) return list.filter(matchesFilters);

  const ranked = [];
  for (const entry of list) {
    const rank = search(entry);
    if (rank !== undefined && (!matchesFilters || matchesFilters(entry))) ranked.push({ entry, rank });
  }
  return ranked.sort((a, b) => a.rank - b.rank).map(({ entry }) => entry);
}

export const GENERATIONS = [
  { value: '1', label: '1ª geração · Kanto' },
  { value: '2', label: '2ª geração · Johto' },
  { value: '3', label: '3ª geração · Hoenn' },
  { value: '4', label: '4ª geração · Sinnoh' },
  { value: '5', label: '5ª geração · Unova' },
  { value: '6', label: '6ª geração · Kalos' },
  { value: '7', label: '7ª geração · Alola' },
  { value: '8', label: '8ª geração · Galar' },
  { value: '9', label: '9ª geração · Paldea' },
];

// Nomes oficiais em inglês (os slugs da PokéAPI vêm das versões japonesas: ground = Field, plant = Grass…).
const EGG_GROUP_LABELS = {
  monster: 'Monster',
  water1: 'Water 1',
  water2: 'Water 2',
  water3: 'Water 3',
  bug: 'Bug',
  flying: 'Flying',
  ground: 'Field',
  fairy: 'Fairy',
  plant: 'Grass',
  humanshape: 'Human-Like',
  mineral: 'Mineral',
  indeterminate: 'Amorphous',
  ditto: 'Ditto',
  dragon: 'Dragon',
  'no-eggs': 'Undiscovered',
};

export const eggGroupLabel = (name) => EGG_GROUP_LABELS[name] ?? formatSlug(name);

const LABEL_PREFIX = {
  type: 'Tipo',
  ability: 'Habilidade',
  move: 'Golpe',
  eggGroup: 'Ovos',
};

/** Filtros de valores fixos: { tipo: [{ value, label, option }] }. `option` é o texto no select. */
export const FIXED_FILTERS = {
  mega: [
    { value: 'with', label: 'Com Mega Evolução', option: 'Com Mega' },
    { value: 'without', label: 'Sem Mega Evolução', option: 'Sem Mega' },
  ],
  gmax: [
    { value: 'with', label: 'Com Gigantamax', option: 'Com Gigantamax' },
    { value: 'without', label: 'Sem Gigantamax', option: 'Sem Gigantamax' },
  ],
  region: [
    { value: 'any', label: 'Formas regionais', option: 'Todas as regionais' },
    { value: 'alola', label: 'Forma de Alola', option: 'Alola' },
    { value: 'galar', label: 'Forma de Galar', option: 'Galar' },
    { value: 'hisui', label: 'Forma de Hisui', option: 'Hisui' },
    { value: 'paldea', label: 'Forma de Paldea', option: 'Paldea' },
  ],
  rarity: [
    { value: 'legendary', label: 'Lendários', option: 'Lendários' },
    { value: 'mythical', label: 'Míticos', option: 'Míticos' },
    { value: 'common', label: 'Comuns', option: 'Comuns (nem lendário nem mítico)' },
  ],
  builds: [{ value: 'with', label: 'Com build da Smogon', option: 'Com build da Smogon' }],
};

// Tipos em que só um valor faz sentido por vez: escolher "Sem Mega" substitui "Com Mega".
export const SINGLE_VALUE_FILTERS = new Set(['mega', 'gmax', 'builds']);

/** Cria o objeto de filtro com a etiqueta da pílula. */
export function createFilter(type, value) {
  if (type === 'generation') {
    return { type, value, label: GENERATIONS.find((g) => g.value === value)?.label ?? `${value}ª geração` };
  }
  if (FIXED_FILTERS[type]) {
    return { type, value, label: FIXED_FILTERS[type].find((option) => option.value === value)?.label ?? value };
  }
  const name = type === 'eggGroup' ? eggGroupLabel(value) : formatSlug(value);
  return { type, value, label: `${LABEL_PREFIX[type]}: ${name}` };
}
