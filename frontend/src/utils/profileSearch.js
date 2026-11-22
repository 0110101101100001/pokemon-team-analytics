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
