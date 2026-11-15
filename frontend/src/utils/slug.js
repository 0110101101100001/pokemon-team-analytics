/** Nome da Smogon → slug da PokéAPI: "Heavy-Duty Boots" → "heavy-duty-boots", "King's Shield" → "kings-shield". */
export const toPokeApiSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[’'.:]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const SMALL_WORDS = new Set(['of', 'the']);

/**
 * Slug → nome com iniciais maiúsculas: "choice-scarf" → "Choice Scarf". Hífens e apóstrofos do nome original
 * não voltam ("heavy-duty-boots" → "Heavy Duty Boots"), mas o Showdown compara nomes sem pontuação.
 */
export const titleFromSlug = (slug) =>
  slug
    .split('-')
    .map((word, index) => (index > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
