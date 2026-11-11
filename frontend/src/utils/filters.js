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

export const GENERATIONS = [
  { value: '1', label: 'Gen 1 · Kanto' },
  { value: '2', label: 'Gen 2 · Johto' },
  { value: '3', label: 'Gen 3 · Hoenn' },
  { value: '4', label: 'Gen 4 · Sinnoh' },
  { value: '5', label: 'Gen 5 · Unova' },
  { value: '6', label: 'Gen 6 · Kalos' },
  { value: '7', label: 'Gen 7 · Alola' },
  { value: '8', label: 'Gen 8 · Galar' },
  { value: '9', label: 'Gen 9 · Paldea' },
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
    return { type, value, label: GENERATIONS.find((g) => g.value === value)?.label ?? `Gen ${value}` };
  }
  if (FIXED_FILTERS[type]) {
    return { type, value, label: FIXED_FILTERS[type].find((option) => option.value === value)?.label ?? value };
  }
  const name = type === 'eggGroup' ? eggGroupLabel(value) : formatSlug(value);
  return { type, value, label: `${LABEL_PREFIX[type]}: ${name}` };
}
