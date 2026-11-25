import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchPokemonIdsLearningMove, fetchPokemonIdsWithAbility } from '../services/api';
import { DEFAULT_GAME_ID, gameById } from '../data/games';
import { FIXED_FILTERS, SINGLE_VALUE_FILTERS, createFiltersMatcher, filterKey, filterPokedex } from '../utils/filters';
import { createSearch, createSearchIndex, loadFuzzySearch, suggestName } from '../utils/search';
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

  // O fuzzy chega com a primeira busca; a busca em curso é refeita quando ele fica disponível.
  const [fuzzyReady, setFuzzyReady] = useState(false);
  const hasSearch = searchTerm.trim() !== '';
  useEffect(() => {
    if (!hasSearch || fuzzyReady) return undefined;
    let active = true;
    loadFuzzySearch().then((ready) => active && ready && setFuzzyReady(true));
    return () => { active = false; };
  }, [hasSearch, fuzzyReady]);

  // Montado uma vez por lista, não a cada tecla.
  const searchIndex = useMemo(() => createSearchIndex(pokemonList), [pokemonList]);
  const search = useMemo(
    () => createSearch(searchIndex, searchTerm),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fuzzyReady refaz a busca com o fuzzy já carregado
    [searchIndex, searchTerm, fuzzyReady],
  );
  const matchesFilters = useMemo(
    () => createFiltersMatcher(activeFilters, remoteFilterSets),
    [activeFilters, remoteFilterSets],
  );

  const applyFilters = useCallback(
    (list) => filterPokedex(list, { search, matchesFilters }),
    [search, matchesFilters],
  );

  // Busca sem resultado: o nome mais parecido entre os que passam nos outros filtros.
  const suggestFor = useCallback((list) => {
    if (!search) return null;
    const allowed = new Set((matchesFilters ? list.filter(matchesFilters) : list).map((entry) => entry.name));
    return suggestName(searchIndex, searchTerm, allowed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idem: a sugestão depende do fuzzy carregado
  }, [search, matchesFilters, searchIndex, searchTerm, fuzzyReady]);

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
      suggestFor,
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
    searchTerm, activeFilters, addFilter, removeFilter, filterStatus, applyFilters, suggestFor,
    advancedOpen, advancedCount, toggleAdvanced, collection, scope, gameId, dexSlug, selectGame,
  ]);
}
