const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const BACKEND_BASE = '/api';

const responseCache = new Map();

function cachedJson(url) {
  let pending = responseCache.get(url);
  if (!pending) {
    pending = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.json();
    });
    pending.catch(() => responseCache.delete(url));
    responseCache.set(url, pending);
  }
  return pending;
}

const idFromUrl = (url) => Number(url.split('/').filter(Boolean).pop());

export const TYPE_NAMES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

/** Mapa id → [tipo1, tipo2] para todos os Pokémon e formas, a partir dos 18 endpoints de tipo. */
export async function fetchTypeIndex() {
  const results = await Promise.all(TYPE_NAMES.map(fetchTypeData));
  const index = new Map();
  results.forEach((data, i) => {
    data?.pokemon.forEach(({ pokemon, slot }) => {
      const id = idFromUrl(pokemon.url);
      const types = index.get(id) ?? [];
      types[slot - 1] = TYPE_NAMES[i];
      index.set(id, types);
    });
  });
  return index;
}

/** Todas as variedades (Pokémon base e formas alternativas) como { name, url }. */
export const fetchPokemonList = (limit = 2000) =>
  cachedJson(`${POKEAPI_BASE}/pokemon?limit=${limit}`).then((data) => data.results);

// Ids ≥ 10000 são entradas fora dos jogos principais (golpes Shadow, habilidades de spin-offs).
const MAIN_SERIES_MAX_ID = 10000;

const fetchNamedList = (url) =>
  cachedJson(url).then((data) =>
    data.results.filter((r) => idFromUrl(r.url) < MAIN_SERIES_MAX_ID).map((r) => r.name));

export const fetchAbilityNames = () => fetchNamedList(`${POKEAPI_BASE}/ability?limit=500`);
export const fetchMoveNames = () => fetchNamedList(`${POKEAPI_BASE}/move?limit=1500`);

/** { names, index }: os nomes dos grupos de ovos e um mapa id da espécie → [grupos]. */
export async function fetchEggGroupIndex() {
  const { results } = await cachedJson(`${POKEAPI_BASE}/egg-group?limit=50`);
  const groups = await Promise.all(results.map((r) => cachedJson(r.url)));
  const index = new Map();
  for (const group of groups) {
    for (const species of group.pokemon_species) {
      const id = idFromUrl(species.url);
      if (!index.has(id)) index.set(id, []);
      index.get(id).push(group.name);
    }
  }
  return { names: groups.map((g) => g.name), index };
}

/** Ids de todos os Pokémon com a habilidade (normal ou oculta). */
export const fetchPokemonIdsWithAbility = (ability) =>
  cachedJson(`${POKEAPI_BASE}/ability/${encodeURIComponent(ability)}`)
    .then((data) => new Set(data.pokemon.map((p) => idFromUrl(p.pokemon.url))));

/** Ids de todos os Pokémon que aprendem o golpe em algum jogo. */
export const fetchPokemonIdsLearningMove = (move) =>
  cachedJson(`${POKEAPI_BASE}/move/${encodeURIComponent(move)}`)
    .then((data) => new Set(data.learned_by_pokemon.map((p) => idFromUrl(p.url))));

/** Todas as espécies como { name, url }; o id da espécie é o número na Pokédex nacional. */
export const fetchSpeciesList = (limit = 1025) =>
  cachedJson(`${POKEAPI_BASE}/pokemon-species?limit=${limit}`).then((data) => data.results);

export const fetchPokemonDetail = (nameOrId) =>
  cachedJson(`${POKEAPI_BASE}/pokemon/${encodeURIComponent(nameOrId)}`);

export const fetchPokemonSpecies = (nameOrId) =>
  cachedJson(`${POKEAPI_BASE}/pokemon-species/${encodeURIComponent(nameOrId)}`).catch(() => null);

export async function fetchSmogonStats(name, tier = 'gen9ou', { date, signal } = {}) {
  const params = new URLSearchParams({ tier });
  if (date) {
    params.append('date', date);
  }

  const response = await fetch(`${BACKEND_BASE}/pokemon/${encodeURIComponent(name)}/stats?${params}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Erro ao buscar estatísticas do Smogon (${response.status})`);
  }

  return response.json();
}

/** Nomes (formato Smogon) de todos os Pokémon com estatísticas em pelo menos um tier. */
export async function fetchSmogonNames() {
  const response = await fetch(`${BACKEND_BASE}/smogon/names`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Erro ao buscar a lista da Smogon (${response.status})`);
  const data = await response.json();
  return data.names ?? [];
}

export async function fetchTeamRecommendation(team, tier = 'gen9ou', limit = 5) {
  const response = await fetch(`${BACKEND_BASE}/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ team, tier, limit }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Não autorizado. Faça login no Supabase para receber recomendações.');
    }
    if (response.status === 404) {
      throw new Error('Nenhuma estatística encontrada para este tier.');
    }
    throw new Error(`Erro ao buscar recomendação (${response.status})`);
  }

  return response.json();
}

export function officialSpriteUrl(nameOrId) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${nameOrId}.png`;
}

export function thumbnailSpriteUrl(nameOrId) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${nameOrId}.png`;
}

export const TIERS = [
  { value: 'gen9ou', label: 'OU - Overused' },
  { value: 'gen9uu', label: 'UU - Underused' },
  { value: 'gen9ubers', label: 'Ubers' },
  { value: 'gen9ru', label: 'RU - Rarely Used' },
  { value: 'gen9nu', label: 'NU - Never Used' },
  { value: 'gen9lc', label: 'LC - Little Cup' },
  { value: 'gen9doublesou', label: 'DOU - Doubles OU' },
];

export const fetchEvolutionChain = (url) => cachedJson(url).catch(() => null);

export const fetchPokemonEncounters = (id) =>
  cachedJson(`${POKEAPI_BASE}/pokemon/${encodeURIComponent(id)}/encounters`);

export const fetchMove = (moveUrlOrName) =>
  cachedJson(
    moveUrlOrName.startsWith('http')
      ? moveUrlOrName
      : `${POKEAPI_BASE}/move/${encodeURIComponent(moveUrlOrName)}`,
  ).catch(() => null);

export const fetchTypeData = (typeName) =>
  cachedJson(`${POKEAPI_BASE}/type/${encodeURIComponent(typeName)}`).catch(() => null);
