import { supabase } from './supabase';
import { HIDDEN_ITEM_CATEGORIES } from '../data/itemCategories';
import { readCached, writeCached } from './persistentCache';
import { evolutionsByItem } from '../utils/itemData';

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

// VITE_API_URL é a origem do backend em produção (ex.: https://api.exemplo.com).
// Sem ela, usa o caminho relativo /api, servido pelo proxy do Vite em desenvolvimento.
// Aceita a variável com ou sem barra final e com ou sem o sufixo /api.
const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '').replace(/\/api$/, '');
const BACKEND_BASE = `${API_ORIGIN}/api`;

const responseCache = new Map();

async function fetchJson(url) {
  const stored = await readCached(url);
  if (stored !== undefined) return stored;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const data = await res.json();
  writeCached(url, data);
  return data;
}

/** Uma requisição por URL na sessão (memória) e entre visitas (IndexedDB); uma falha não fica em cache. */
function cachedJson(url) {
  let pending = responseCache.get(url);
  if (!pending) {
    pending = fetchJson(url);
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

// Variedades, espécies, tipos e grupos de ovos vêm de um índice estático (scripts/build-pokedex-index.mjs):
// um arquivo de ~80 KB com cache imutável no lugar de mais de 40 requisições à PokéAPI por visita.
let pokedexIndex = null;
const loadPokedexIndex = () => {
  pokedexIndex ??= import('../data/pokedex-index.json').then((module) => module.default).catch((error) => {
    pokedexIndex = null;
    throw error;
  });
  return pokedexIndex;
};

const asNamedResources = (entries, resource) =>
  entries.map(([id, name]) => ({ name, url: `${POKEAPI_BASE}/${resource}/${id}/` }));

/** Mapa id → [tipo1, tipo2] para todos os Pokémon e formas. */
export const fetchTypeIndex = () =>
  loadPokedexIndex().then((index) => new Map(Object.entries(index.types).map(([id, types]) => [Number(id), types])));

/** Todas as variedades (Pokémon base e formas alternativas) como { name, url }. */
export const fetchPokemonList = () =>
  loadPokedexIndex().then((index) => asNamedResources(index.pokemon, 'pokemon'));

// Ids ≥ 10000 são entradas fora dos jogos principais (golpes Shadow, habilidades de spin-offs).
const MAIN_SERIES_MAX_ID = 10000;

const fetchNamedList = (url) =>
  cachedJson(url).then((data) =>
    data.results.filter((r) => idFromUrl(r.url) < MAIN_SERIES_MAX_ID).map((r) => r.name));

export const fetchAbilityNames = () => fetchNamedList(`${POKEAPI_BASE}/ability?limit=500`);
export const fetchMoveNames = () => fetchNamedList(`${POKEAPI_BASE}/move?limit=1500`);

/** { names, index }: os nomes dos grupos de ovos e um mapa id da espécie → [grupos]. */
export async function fetchEggGroupIndex() {
  const { eggGroups } = await loadPokedexIndex();
  const index = new Map(
    Object.entries(eggGroups.bySpecies).map(([id, groups]) => [Number(id), groups.map((g) => eggGroups.names[g])]),
  );
  return { names: eggGroups.names, index };
}

/** Nomes das espécies sem gênero (Magnemite, Bronzor…): só cruzam com Ditto. */
export const fetchGenderlessSpecies = () =>
  cachedJson(`${POKEAPI_BASE}/gender/genderless`)
    .then((data) => new Set(data.pokemon_species_details.map((detail) => detail.pokemon_species.name)));

/** Ids de todos os Pokémon com a habilidade (normal ou oculta). */
export const fetchPokemonIdsWithAbility = (ability) =>
  cachedJson(`${POKEAPI_BASE}/ability/${encodeURIComponent(ability)}`)
    .then((data) => new Set(data.pokemon.map((p) => idFromUrl(p.pokemon.url))));

/** Ids de todos os Pokémon que aprendem o golpe em algum jogo. */
export const fetchPokemonIdsLearningMove = (move) =>
  cachedJson(`${POKEAPI_BASE}/move/${encodeURIComponent(move)}`)
    .then((data) => new Set(data.learned_by_pokemon.map((p) => idFromUrl(p.url))));

/** Todos os Pokémon (formas incluídas) que aprendem o golpe em algum jogo, como { name, id }. */
export const fetchMoveLearners = (move) =>
  cachedJson(`${POKEAPI_BASE}/move/${encodeURIComponent(move)}`)
    .then((data) => data.learned_by_pokemon.map((p) => ({ name: p.name, id: idFromUrl(p.url) })));

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Formas de batalha de uma variedade: Megas ("charizard-mega-x") e Primal ("kyogre-primal").
 * Elas ficam fora da grade da Pokédex; aqui vêm da mesma lista de variedades, já em cache.
 */
export async function fetchBattleForms(name) {
  const pattern = new RegExp(`^${escapeRegExp(name)}-(mega(-[a-z])?|primal)$`);
  const list = await fetchPokemonList();
  return list.filter((entry) => pattern.test(entry.name)).map((entry) => entry.name);
}

/** Todas as espécies como { name, url }; o id da espécie é o número na Pokédex nacional. */
export const fetchSpeciesList = () =>
  loadPokedexIndex().then((index) => asNamedResources(index.species, 'pokemon-species'));

/** Mapa número nacional → número na Pokédex regional (`slug` de /pokedex, ex.: "paldea"). */
export const fetchRegionalDex = (slug) =>
  cachedJson(`${POKEAPI_BASE}/pokedex/${encodeURIComponent(slug)}`).then(
    (data) => new Map(data.pokemon_entries.map((entry) => [idFromUrl(entry.pokemon_species.url), entry.entry_number])),
  );

export const fetchPokemonDetail = (nameOrId) =>
  cachedJson(`${POKEAPI_BASE}/pokemon/${encodeURIComponent(nameOrId)}`);

export const fetchPokemonSpecies = (nameOrId) =>
  cachedJson(`${POKEAPI_BASE}/pokemon-species/${encodeURIComponent(nameOrId)}`).catch(() => null);

const LOGIN_REQUIRED = 'Não autorizado. Faça login no Supabase para receber recomendações.';

export async function fetchTeamRecommendation(team, tier = 'gen9ou', limit = 5) {
  // getSession renova o access token quando está expirado.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error(LOGIN_REQUIRED);

  const response = await fetch(`${BACKEND_BASE}/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ team, tier, limit }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(LOGIN_REQUIRED);
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

/**
 * Sprite 2D animado de Black/White (GIF em pixel art), normal ou shiny.
 * A geração V só tem sprites até o nº 649.
 */
export function animatedSpriteUrl(id, { shiny = false } = {}) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${shiny ? 'shiny/' : ''}${id}.gif`;
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

// Golpes de vários acertos que a PokéAPI publica sem `meta.min_hits`/`max_hits`.
const MULTI_HIT_FALLBACK = { 'population-bomb': [1, 10] };

/**
 * O essencial de um golpe para cobertura e cálculo de dano; null se o golpe não existir.
 * `effectChance` marca golpes com efeito secundário (Sheer Force); `minHits`/`maxHits` só
 * aparecem nos golpes de vários acertos.
 */
const STAT_KEYS_BY_NAME = { attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spd', speed: 'spe' };

/**
 * O que o golpe faz além do dano, como a PokéAPI publica (meta, stat_changes, target). Chances 0 valem como certas:
 * a PokéAPI usa 0 nos golpes de status, em que o efeito sempre acontece.
 */
export const moveEffectsOf = (data) => ({
  target: data.target?.name ?? null,
  category: data.meta?.category?.name ?? null,
  statChanges: (data.stat_changes ?? [])
    .map(({ change, stat }) => ({ stat: STAT_KEYS_BY_NAME[stat.name], change }))
    .filter((entry) => entry.stat),
  statChance: data.meta?.stat_chance ?? 0,
  ailment: data.meta?.ailment?.name && data.meta.ailment.name !== 'none' ? data.meta.ailment.name : null,
  ailmentChance: data.meta?.ailment_chance ?? 0,
  healing: data.meta?.healing ?? 0,
  drain: data.meta?.drain ?? 0,
  flinchChance: data.meta?.flinch_chance ?? 0,
});

export const fetchMoveSummary = (slug) =>
  fetchMove(slug).then((data) => {
    if (!data) return null;
    const [minHits, maxHits] = MULTI_HIT_FALLBACK[data.name] ?? [data.meta?.min_hits, data.meta?.max_hits];
    return {
      slug: data.name,
      type: data.type.name,
      damageClass: data.damage_class.name,
      power: data.power,
      priority: data.priority ?? 0,
      effectChance: data.effect_chance ?? null,
      ...(maxHits > 1 && { minHits, maxHits }),
      effects: moveEffectsOf(data),
    };
  });

/* ---------------------------------------------------------------- itens */

// Os cristais Z aparecem duas vezes ("-z--held" e "-z--bag"); fica só o segurado, sem o sufixo.
const HELD_SUFFIX = /--held$/;
const isBagCopy = (name) => name.endsWith('--bag');

/** Nomes de todos os itens, numa requisição só (sugestões do campo de item). */
export const fetchItemNames = () =>
  cachedJson(`${POKEAPI_BASE}/item?limit=3000`).then((data) =>
    data.results.filter((item) => !isBagCopy(item.name)).map((item) => item.name.replace(HELD_SUFFIX, '')));

/**
 * Os itens relevantes como { name, id, category, pocket }, sem as categorias de HIDDEN_ITEM_CATEGORIES.
 * Vêm de um índice estático (scripts/build-items.mjs), baixado só ao abrir a aba: pela API REST a categoria
 * de cada item custaria uma requisição por categoria.
 */
export async function fetchItemIndex() {
  const { categories, items } = (await import('../data/items.json')).default;
  return items
    .map(([id, name, categoryIndex]) => ({ name, id, category: categories[categoryIndex][0], pocket: categories[categoryIndex][1] }))
    .filter((item) => !HIDDEN_ITEM_CATEGORIES.has(item.category));
}

/**
 * Onde um item aparece segurado por Pokémon selvagens, por versão: [{ versions, holders: [{ name, id, rarity }] }].
 * Versões com exatamente os mesmos Pokémon e chances ficam juntas, na ordem de lançamento.
 * É o único dado de "onde encontrar" que a PokéAPI tem: locais no chão e lojas não existem na API.
 */
function groupHeldBy(heldByPokemon) {
  const holdersByVersion = new Map();
  for (const { pokemon, version_details: details } of heldByPokemon) {
    for (const { rarity, version } of details) {
      const entry = holdersByVersion.get(version.name) ?? { id: idFromUrl(version.url), holders: [] };
      entry.holders.push({ name: pokemon.name, id: idFromUrl(pokemon.url), rarity });
      holdersByVersion.set(version.name, entry);
    }
  }

  const groups = new Map();
  const versions = [...holdersByVersion].sort(([, a], [, b]) => a.id - b.id);
  for (const [version, { holders }] of versions) {
    holders.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
    const key = holders.map((holder) => `${holder.name}:${holder.rarity}`).join(',');
    const group = groups.get(key) ?? { versions: [], holders };
    group.versions.push(version);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/* ---------------------------------------------------------------- golpes e habilidades (textos) */

// A PokéAPI grafa os códigos de idioma em minúsculas ("pt-br"), por isso a comparação ignora caixa.
const LANGUAGE_PRIORITY = ['pt-br', 'pt', 'en'];

// Os textos dos jogos trazem hifens opcionais e quebras de linha do layout original;
// só as linhas em branco (parágrafos) são mantidas.
const cleanGameText = (text) =>
  text
    .replace(/­/g, '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');

/**
 * Escolhe o texto em pt-BR, depois pt, depois inglês. Dentro do idioma vale a entrada mais
 * recente (as listas vêm em ordem cronológica de jogo). `translated` é false quando só há inglês.
 */
function pickLocalized(entries, field) {
  for (const language of LANGUAGE_PRIORITY) {
    const entry = entries?.findLast((e) => e.language.name.toLowerCase() === language && e[field]);
    if (entry) return { text: cleanGameText(entry[field]), translated: language !== 'en' };
  }
  return null;
}

/** "King's Shield" → "kings-shield", "As One (Glastrier)" → "as-one-glastrier"; slugs passam intactos. */
export const toPokeApiSlug = (name) =>
  name.toLowerCase().replace(/['’.:]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const fallbackName = (slug) => ({ text: slug.replace(/-/g, ' '), translated: false });

/** Dados de um golpe prontos para exibição. Rejeita se o golpe não existir. */
export async function fetchMoveInfo(slug) {
  const data = await cachedJson(`${POKEAPI_BASE}/move/${encodeURIComponent(moveSlug(slug))}`);
  // "$effect_chance" é o marcador da PokéAPI para a chance do efeito secundário.
  const withChance = (entry) =>
    entry && { ...entry, text: entry.text.replace(/\$effect_chance/g, data.effect_chance ?? '') };

  return {
    kind: 'move',
    name: pickLocalized(data.names, 'name') ?? fallbackName(slug),
    description: pickLocalized(data.flavor_text_entries, 'flavor_text'),
    shortEffect: withChance(pickLocalized(data.effect_entries, 'short_effect')),
    effect: withChance(pickLocalized(data.effect_entries, 'effect')),
    type: data.type?.name ?? null,
    damageClass: data.damage_class?.name ?? null,
    power: data.power,
    accuracy: data.accuracy,
    pp: data.pp,
    priority: data.priority,
    effectChance: data.effect_chance,
    target: data.target?.name ?? null,
    generation: data.generation?.name ?? null,
  };
}

// Na PokéAPI os cristais Z têm duas entradas; a segurada em batalha é "<nome>-z--held".
const itemSlug = (slug) => (slug.endsWith('-z') ? `${slug}--held` : slug);

// "Hidden Power Fire" é o golpe Hidden Power com o tipo já escolhido.
const moveSlug = (slug) => (slug.startsWith('hidden-power-') ? 'hidden-power' : slug);

/** Ícone de um item a partir do nome de exibição ("Heavy-Duty Boots"). */
export const itemSpriteUrl = (name) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemSlug(toPokeApiSlug(name))}.png`;

/** Dados de um item prontos para exibição. Rejeita se o item não existir na PokéAPI. */
export async function fetchItemInfo(slug) {
  const data = await cachedJson(`${POKEAPI_BASE}/item/${encodeURIComponent(itemSlug(slug))}`);
  return {
    kind: 'item',
    name: pickLocalized(data.names, 'name') ?? fallbackName(slug),
    // Nos itens o texto do jogo vem em `text`, não em `flavor_text`.
    description: pickLocalized(data.flavor_text_entries, 'text'),
    shortEffect: pickLocalized(data.effect_entries, 'short_effect'),
    effect: pickLocalized(data.effect_entries, 'effect'),
    sprite: data.sprites?.default ?? null,
    category: data.category?.name ?? null,
    heldBy: groupHeldBy(data.held_by_pokemon ?? []),
    evolutions: await evolutionsByItem(data.name),
  };
}

/** Dados de uma habilidade prontos para exibição. Rejeita se a habilidade não existir. */
export async function fetchAbilityInfo(slug) {
  const data = await cachedJson(`${POKEAPI_BASE}/ability/${encodeURIComponent(slug)}`);
  return {
    kind: 'ability',
    name: pickLocalized(data.names, 'name') ?? fallbackName(slug),
    description: pickLocalized(data.flavor_text_entries, 'flavor_text'),
    shortEffect: pickLocalized(data.effect_entries, 'short_effect'),
    effect: pickLocalized(data.effect_entries, 'effect'),
    generation: data.generation?.name ?? null,
    pokemonCount: data.pokemon?.length ?? 0,
  };
}
