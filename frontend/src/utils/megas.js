import MEGA_LIST from '../data/megas.json';

// Megas e Primais de megas.json (scripts/build-megas.mjs), com a diferença de cada atributo para a forma base.

export const MEGA_STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

const sum = (values) => values.reduce((total, value) => total + value, 0);

export const MEGAS = MEGA_LIST.map((mega) => ({
  ...mega,
  isPrimal: mega.name.endsWith('-primal'),
  diffs: mega.stats.map((value, index) => value - (mega.baseStats[index] ?? 0)),
  total: sum(mega.stats),
  baseTotal: sum(mega.baseStats),
  typesChanged: mega.types.join('/') !== mega.baseTypes.join('/'),
}));

const GENERATION_BY_FORM = new Map(MEGAS.map((mega) => [mega.name, mega.generation]));

/** Geração de estreia de uma Mega ou Primal ("raichu-mega-x" → 9), ou null para outras formas. */
export const megaGeneration = (formName) => GENERATION_BY_FORM.get(formName) ?? null;

// As Megas da 9ª geração são de Legends: Z-A, que se passa em Kalos: o nome da região da geração enganaria.
const MEGA_DEBUT_LABELS = { 6: '6ª geração · X / Y e ORAS', 9: '9ª geração · Legends: Z-A' };

/** Rótulo da estreia de uma Mega pela geração, ou null se não houver um próprio. */
export const megaDebutLabel = (generation) => MEGA_DEBUT_LABELS[generation] ?? null;

const searchable = (text) => text.toLowerCase().replace(/-/g, ' ');

/** Filtra por texto (nome da Mega, da forma base ou da pedra) e por tipo da Mega. */
export function filterMegas(megas, { term, type }) {
  const query = searchable(term.trim());
  return megas.filter((mega) =>
    (!type || mega.types.includes(type))
    && (!query || [mega.name, mega.base, mega.stone ?? ''].some((text) => searchable(text).includes(query))));
}
