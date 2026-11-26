const normalize = (text) => text.normalize('NFD').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Espécies pelo nome ou número: "mr. mime" acha mr-mime, "#025" acha o 25 antes de 250–259. */
export function searchProfiles(species, query) {
  const term = normalize(query);
  if (!term) return query.trim() ? [] : species;

  if (/^\d+$/.test(term)) {
    const number = String(Number(term));
    const exact = species.filter((entry) => String(entry.number) === number);
    const prefixed = species.filter((entry) => String(entry.number) !== number && String(entry.number).startsWith(number));
    return [...exact, ...prefixed];
  }
  return species.filter((entry) => normalize(entry.species).includes(term));
}

/**
 * Recorte da grade do Perfil depois da busca: só uma geração (`generation` null = todas) e, com `favoritesFirst`,
 * as espécies favoritas na frente (na ordem da Pokédex), seguidas das outras.
 * `favorites` é um Set de nomes; vale o nome da espécie ou da variedade.
 */
export function arrangeProfiles(species, { generation = null, favorites = null, favoritesFirst = false } = {}) {
  const inGeneration = generation ? species.filter((entry) => entry.generation === generation) : species;
  if (!favoritesFirst || !favorites?.size) return inGeneration;
  const isFavorite = (entry) => favorites.has(entry.name) || favorites.has(entry.species);
  return [...inGeneration.filter(isFavorite), ...inGeneration.filter((entry) => !isFavorite(entry))];
}
