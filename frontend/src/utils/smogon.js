// Nomes da Smogon cuja forma normalizada não coincide com o slug da PokéAPI.
const SLUG_ALIASES = {
  'necrozma-dusk-mane': 'necrozma-dusk',
  'necrozma-dawn-wings': 'necrozma-dawn',
};

/**
 * "Landorus-Therian" → "landorus-therian", "Farfetch’d-Galar" → "farfetchd-galar",
 * "Mr. Mime" → "mr-mime", "Type: Null" → "type-null".
 * Devolve variantes: "Indeedee-F" gera "indeedee-f" (Nidoran-F) e "indeedee-female".
 */
function smogonSlugs(name) {
  const slug = name
    .toLowerCase()
    .replace(/[’'.:%]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const slugs = [SLUG_ALIASES[slug] ?? slug];
  if (/-f$/.test(slug)) slugs.push(slug.replace(/-f$/, '-female'));
  if (/-m$/.test(slug)) slugs.push(slug.replace(/-m$/, '-male'));
  return slugs;
}

/**
 * Cruza os nomes da Smogon com as entradas da grade e devolve Map(entry.name → nome na Smogon).
 * - Espécie base: casa pelo slug da espécie ("Landorus" → landorus-incarnate).
 * - Forma: casa pelo próprio slug ou por um prefixo mais longo do que a espécie
 *   ("Tauros-Paldea-Combat" → tauros-paldea-combat-breed), nunca pela espécie sozinha,
 *   para Tauros base no OU não marcar as formas de Paldea.
 */
export function buildSmogonNameIndex(entries, smogonNames) {
  const bySlug = new Map();
  for (const name of smogonNames) {
    for (const slug of smogonSlugs(name)) bySlug.set(slug, name);
  }

  const index = new Map();
  for (const entry of entries) {
    const direct = bySlug.get(entry.name) ?? (entry.isForm ? undefined : bySlug.get(entry.species));
    if (direct) {
      index.set(entry.name, direct);
      continue;
    }
    if (!entry.isForm) continue;

    const parts = entry.name.split('-');
    const speciesLength = entry.species.split('-').length;
    for (let end = parts.length - 1; end > speciesLength; end--) {
      const match = bySlug.get(parts.slice(0, end).join('-'));
      if (match) {
        index.set(entry.name, match);
        break;
      }
    }
  }
  return index;
}

/** { [entry.name]: true } para as entradas com estatísticas na Smogon. */
export function buildSmogonBadgeMap(entries, smogonNames) {
  const map = {};
  for (const name of buildSmogonNameIndex(entries, smogonNames).keys()) map[name] = true;
  return map;
}
