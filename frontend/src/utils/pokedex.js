export const DEX_SIZE = 1025;

const GEN_LIMITS = [151, 251, 386, 493, 649, 721, 809, 905, 1025];

export const generationOf = (dexNumber) => GEN_LIMITS.findIndex((max) => dexNumber <= max) + 1;

// Variedades que não entram na grelha: Mega/Primal e Gigantamax (vivem no seletor de formas do drawer),
// e duplicados cosméticos, de habilidade ou de montada.
const EXCLUDED_FORMS = [
  /-(mega|primal)(-|$)/,
  /-gmax$/,
  /-totem(-|$)/,
  /-(starter|cosplay|cap|power-construct|battle-bond|own-tempo|build|mode)$/,
  /^pikachu-(rock-star|belle|pop-star|phd|libre)$/,
  /^(minior|squawkabilly|tatsugiri|maushold|dudunsparce)-/,
];

const REGIONAL_GENERATION = { alola: 7, galar: 8, hisui: 8, paldea: 9 };
const REGIONAL_PATTERN = /-(alola|galar|hisui|paldea)(-|$)/;

// Formas não regionais lançadas numa geração posterior à da espécie.
const FORM_GENERATION = {
  'ursaluna-bloodmoon': 9,
  'dialga-origin': 8,
  'palkia-origin': 8,
  'basculin-white-striped': 8,
  'greninja-ash': 7,
  'zygarde-10': 7,
  'zygarde-complete': 7,
};

function formGeneration(name, speciesNumber) {
  const regional = name.match(REGIONAL_PATTERN);
  if (regional) return REGIONAL_GENERATION[regional[1]];
  return FORM_GENERATION[name] ?? generationOf(speciesNumber);
}

const isExcludedForm = (name) => EXCLUDED_FORMS.some((pattern) => pattern.test(name));

const idFromUrl = (url) => Number(url.split('/').filter(Boolean).pop());

/**
 * Encontra a espécie de uma forma pelo prefixo mais longo do slug:
 * "tauros-paldea-combat-breed" → "tauros-paldea-combat" → "tauros-paldea" → "tauros".
 */
function resolveSpeciesId(formName, speciesIds) {
  let candidate = formName;
  while (candidate.includes('-')) {
    candidate = candidate.slice(0, candidate.lastIndexOf('-'));
    const id = speciesIds.get(candidate);
    if (id) return id;
  }
  return null;
}

/**
 * Junta a lista de Pokémon e o índice de tipos nas entradas da Pokédex.
 * Sem `species`, só entram as espécies base (#1–#1025). Com `species`, as formas alternativas
 * também entram: herdam o número da espécie (ficando logo a seguir a ela), mas têm o seu id,
 * os seus tipos e a geração em que foram lançadas (Alola 7, Galar/Hisui 8, Paldea 9).
 */
export function buildPokedexEntries({ pokemon, typeIndex, eggGroupIndex = null, species = null }) {
  const speciesIds = species ? new Map(species.map((s) => [s.name, idFromUrl(s.url)])) : null;
  const speciesNames = species ? new Map(species.map((s) => [idFromUrl(s.url), s.name])) : null;
  const entries = [];

  for (const { name, url } of pokemon) {
    const id = idFromUrl(url);
    const isForm = id > DEX_SIZE;
    if (isForm && (!speciesIds || isExcludedForm(name))) continue;

    const number = isForm ? resolveSpeciesId(name, speciesIds) : id;
    if (!number || number > DEX_SIZE) continue;

    entries.push({
      name,
      id,
      number,
      species: speciesNames?.get(number) ?? name,
      isForm,
      types: typeIndex.get(id) ?? [],
      eggGroups: eggGroupIndex?.get(number) ?? [],
      generation: isForm ? formGeneration(name, number) : generationOf(number),
    });
  }

  return entries.sort((a, b) => a.number - b.number || a.id - b.id);
}
