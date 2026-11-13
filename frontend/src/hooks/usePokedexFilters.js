import { useCallback, useMemo, useRef, useState } from 'react';
import { fetchPokemonIdsLearningMove, fetchPokemonIdsWithAbility } from '../services/api';
import { DEFAULT_GAME_ID, gameById } from '../data/games';
import { FIXED_FILTERS, SINGLE_VALUE_FILTERS, createSearchMatcher, filterKey } from '../utils/filters';
import { fetchPokemonIdsWithBuilds } from '../utils/smogonSets';

// Filtros resolvidos sob demanda: cada um devolve o Set de ids de Pokémon que o cumprem.
// Recebem o valor do filtro e as entradas da grade.
const REMOTE_FILTERS = {
  ability: fetchPokemonIdsWithAbility,
  move: fetchPokemonIdsLearningMove,
  builds: (_value, entries) => fetchPokemonIdsWithBuilds(entries),
};
const ADVANCED_TYPES = new Set(['ability', 'move', 'eggGroup', ...Object.keys(FIXED_FILTERS)]);

/**
 * Estado dos filtros da Pokédex: busca, filtros ativos, coleção e o recorte nacional/regional.
 * Vive no App, e não na seção, para o usuário reencontrar a Pokédex como deixou ao voltar de outra aba.
 */
export function usePokedexFilters(pokemonList) {
  // Vem do FiltersBar já com debounce: digitar não re-renderiza a seção a cada tecla.
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  // filterKey → Set de ids (resolvido) | "loading" | "error"
  const [remoteFilterSets, setRemoteFilterSets] = useState({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // "all" | "favorites" | "history"
  const [collection, setCollection] = useState('all');
  // "national" | "regional"
  const [scope, setScope] = useState('national');
  const [gameId, setGameId] = useState(DEFAULT_GAME_ID);
  const [dexSlug, setDexSlug] = useState(null);

  const pokemonListRef = useRef(pokemonList);
  pokemonListRef.current = pokemonList;

  const addFilter = useCallback((filter) => {
    const key = filterKey(filter);
    setActiveFilters((prev) => {
      if (prev.some((f) => filterKey(f) === key)) return prev;
      const kept = SINGLE_VALUE_FILTERS.has(filter.type) ? prev.filter((f) => f.type !== filter.type) : prev;
      return [...kept, filter];
    });

    const resolve = REMOTE_FILTERS[filter.type];
    if (!resolve) return;
    setRemoteFilterSets((prev) => (prev[key] instanceof Set ? prev : { ...prev, [key]: 'loading' }));
    resolve(filter.value, pokemonListRef.current)
      .then((ids) => setRemoteFilterSets((prev) => ({ ...prev, [key]: ids })))
      .catch(() => setRemoteFilterSets((prev) => ({ ...prev, [key]: 'error' })));
  }, []);

  const removeFilter = useCallback((key) => {
    setActiveFilters((prev) => prev.filter((f) => filterKey(f) !== key));
  }, []);

  const toggleAdvanced = useCallback(() => setAdvancedOpen((open) => !open), []);

  const selectGame = useCallback((id) => {
    setGameId(id);
    setDexSlug(null);
  }, []);

  // Gerações, regiões e raridades: OR dentro do grupo. Os demais critérios: AND.
  // Filtros remotos ainda carregando (ou que falharam) são ignorados até terem o Set de ids.
  const applyFilters = useCallback((list) => {
    const matchesSearch = createSearchMatcher(searchTerm);
    if (!matchesSearch && activeFilters.length === 0) return list;

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
    return list.filter((p) =>
      (!matchesSearch || matchesSearch(p)) &&
      (!gens.size || gens.has(p.generation)) &&
      (!regions.size || (p.region !== null && (regions.has('any') || regions.has(p.region)))) &&
      (!rarities.size || rarities.has(p.rarity ?? 'common')) &&
      types.every((t) => p.types.includes(t)) &&
      eggGroups.every((g) => p.eggGroups.includes(g)) &&
      flags.every(([flag, expected]) => p[flag] === expected) &&
      idSets.every((ids) => ids.has(p.id)));
  }, [searchTerm, activeFilters, remoteFilterSets]);

  const filterStatus = useMemo(() => {
    const status = {};
    for (const [key, value] of Object.entries(remoteFilterSets)) {
      if (typeof value === 'string') status[key] = value;
    }
    return status;
  }, [remoteFilterSets]);

  const advancedCount = useMemo(
    () => activeFilters.filter((f) => ADVANCED_TYPES.has(f.type)).length,
    [activeFilters],
  );

  return useMemo(() => {
    const game = gameById(gameId);
    return {
      searchTerm,
      setSearchTerm,
      activeFilters,
      addFilter,
      removeFilter,
      filterStatus,
      applyFilters,
      advancedOpen,
      advancedCount,
      toggleAdvanced,
      collection,
      setCollection,
      scope,
      setScope,
      game,
      selectGame,
      dex: game.dexes.find((dex) => dex.slug === dexSlug) ?? game.dexes[0],
      selectDex: setDexSlug,
    };
  }, [
    searchTerm, activeFilters, addFilter, removeFilter, filterStatus, applyFilters,
    advancedOpen, advancedCount, toggleAdvanced, collection, scope, gameId, dexSlug, selectGame,
  ]);
}
