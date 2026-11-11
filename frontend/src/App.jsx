import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PokemonGrid from "./components/PokemonGrid";
import PokemonDrawer from "./components/PokemonDrawer";
import FiltersBar, { ActiveFilters, AdvancedFilters } from "./components/FiltersBar";
import { FIXED_FILTERS, SINGLE_VALUE_FILTERS, createSearchMatcher, filterKey } from "./utils/filters";
import SmeargleMascote from "./components/SmeargleMascote";
import Reveal from "./components/Reveal";
import AuthModal from "./components/AuthModal";
import AuthButton from "./components/AuthButton";
import TeamBuilderButton from "./components/TeamBuilderButton";
import TeamBuilderModal from "./components/TeamBuilderModal";
import AboutButton from "./components/AboutButton";
import AboutModal from "./components/AboutModal";
import CollectionTabs, { COLLECTIONS, CollectionNotice } from "./components/CollectionTabs";
import { InkSplash, InkSplatter, PageVignette, TornEdge } from "./components/InkDecor";
import { useScrollCollapsed } from "./hooks/useScrollCollapsed";
import { useUserCollections } from "./hooks/useUserCollections";
import {
  fetchEggGroupIndex, fetchPokemonIdsLearningMove, fetchPokemonIdsWithAbility,
  fetchPokemonList, fetchSmogonNames, fetchSpeciesList, fetchTypeIndex, officialSpriteUrl,
} from "./services/api";
import { buildPokedexEntries } from "./utils/pokedex";
import { buildSmogonBadgeMap } from "./utils/smogon";
import { fetchPokemonIdsWithBuilds } from "./utils/smogonSets";

const SMEARGLE_ID = 235;

// Filtros resolvidos sob demanda: cada um devolve o Set de ids de Pokémon que o cumprem.
// Recebem o valor do filtro e as entradas da grade.
const REMOTE_FILTERS = {
  ability: fetchPokemonIdsWithAbility,
  move: fetchPokemonIdsLearningMove,
  builds: (_value, entries) => fetchPokemonIdsWithBuilds(entries),
};
const ADVANCED_TYPES = new Set(["ability", "move", "eggGroup", ...Object.keys(FIXED_FILTERS)]);
const EASE = "transition-all duration-500 max-md:duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
// Celular: fundo opaco e sombra curta (blur e sombras longas pesam no scroll). md+: vidro e sombra longa.
const HEADER_SURFACE = {
  collapsed: "bg-[#78614E] shadow-md md:bg-[#78614E]/88 md:backdrop-blur-xl md:shadow-[0_18px_40px_-20px_rgba(38,26,19,0.7)]",
  expanded: "bg-[#78614E] shadow-md md:bg-[#78614E]/96 md:backdrop-blur-md md:shadow-lg",
};

export default function App() {
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  // Vem do FiltersBar já com debounce: digitar não re-renderiza o App a cada tecla.
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  // filterKey → Set de ids (resolvido) | "loading" | "error"
  const [remoteFilterSets, setRemoteFilterSets] = useState({});
  const [eggGroupNames, setEggGroupNames] = useState([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hasSmogonDataMap, setHasSmogonDataMap] = useState({});
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // "all" | "favorites" | "history": coleção exibida na grade.
  const [view, setView] = useState("all");
  const collections = useUserCollections(session);
  const { toggleFavorite, recordView } = collections;
  const [team, setTeam] = useState([]);
  const collapsed = useScrollCollapsed();

  const markSmogonData = useCallback((name) => {
    setHasSmogonDataMap((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
  }, []);

  useEffect(() => {
    let active = true;
    // Espécies base + formas regionais/alternativas; Megas e Gigantamax ficam no drawer.
    // /pokemon?limit=2000 já traz todas as varieties num só pedido (evita 1025 pedidos a /pokemon-species).
    // A lista da Smogon vem do backend próprio: não bloqueia a grade e, se falhar,
    // o selo continua sendo marcado pelo drawer como antes.
    const smogonNames = fetchSmogonNames().catch((err) => {
      console.warn("Selo Smogon indisponível:", err);
      return [];
    });

    Promise.all([fetchPokemonList(), fetchSpeciesList(), fetchTypeIndex(), fetchEggGroupIndex()])
      .then(([pokemon, species, typeIndex, eggGroups]) => {
        if (!active) return;
        const entries = buildPokedexEntries({ pokemon, species, typeIndex, eggGroupIndex: eggGroups.index });
        setPokemonList(entries);
        setEggGroupNames(eggGroups.names);

        smogonNames.then((names) => {
          if (!active || names.length === 0) return;
          const badges = buildSmogonBadgeMap(entries, names);
          setHasSmogonDataMap((prev) => ({ ...badges, ...prev }));
        });
      })
      .catch((err) => console.error("Erro ao carregar lista:", err))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

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
    setRemoteFilterSets((prev) => (prev[key] instanceof Set ? prev : { ...prev, [key]: "loading" }));
    resolve(filter.value, pokemonListRef.current)
      .then((ids) => setRemoteFilterSets((prev) => ({ ...prev, [key]: ids })))
      .catch(() => setRemoteFilterSets((prev) => ({ ...prev, [key]: "error" })));
  }, []);

  const removeFilter = useCallback((key) => {
    setActiveFilters((prev) => prev.filter((f) => filterKey(f) !== key));
  }, []);

  const toggleAdvanced = useCallback(() => setAdvancedOpen((open) => !open), []);

  const entryByName = useMemo(() => new Map(pokemonList.map((p) => [p.name, p])), [pokemonList]);

  // Favoritos e histórico são listas de nomes; na grade viram as mesmas entradas da Pokédex,
  // na ordem da coleção (mais recentes primeiro). A busca e os filtros valem sobre a coleção.
  const baseList = useMemo(() => {
    if (view === "all") return pokemonList;
    const names = view === "favorites" ? collections.favorites : collections.history.map((visit) => visit.name);
    return names.map((name) => entryByName.get(name)).filter(Boolean);
  }, [view, pokemonList, entryByName, collections.favorites, collections.history]);

  // Gerações, regiões e raridades: OR dentro do grupo. Os demais critérios: AND.
  // Filtros remotos ainda carregando (ou que falharam) são ignorados até terem o Set de ids.
  const filteredList = useMemo(() => {
    const matchesSearch = createSearchMatcher(searchTerm);
    const gens = new Set();
    const regions = new Set();
    const rarities = new Set();
    const types = [];
    const eggGroups = [];
    const idSets = [];
    const flags = [];
    for (const f of activeFilters) {
      if (f.type === "generation") gens.add(Number(f.value));
      else if (f.type === "region") regions.add(f.value);
      else if (f.type === "rarity") rarities.add(f.value);
      else if (f.type === "type") types.push(f.value);
      else if (f.type === "eggGroup") eggGroups.push(f.value);
      else if (f.type === "mega") flags.push(["hasMega", f.value === "with"]);
      else if (f.type === "gmax") flags.push(["hasGmax", f.value === "with"]);
      else if (remoteFilterSets[filterKey(f)] instanceof Set) idSets.push(remoteFilterSets[filterKey(f)]);
    }
    if (!matchesSearch && activeFilters.length === 0) return baseList;
    return baseList.filter((p) =>
      (!matchesSearch || matchesSearch(p)) &&
      (!gens.size || gens.has(p.generation)) &&
      (!regions.size || (p.region !== null && (regions.has("any") || regions.has(p.region)))) &&
      (!rarities.size || rarities.has(p.rarity ?? "common")) &&
      types.every((t) => p.types.includes(t)) &&
      eggGroups.every((g) => p.eggGroups.includes(g)) &&
      flags.every(([flag, expected]) => p[flag] === expected) &&
      idSets.every((ids) => ids.has(p.id)));
  }, [baseList, searchTerm, activeFilters, remoteFilterSets]);

  const filterStatus = useMemo(() => {
    const status = {};
    for (const [key, value] of Object.entries(remoteFilterSets)) {
      if (typeof value === "string") status[key] = value;
    }
    return status;
  }, [remoteFilterSets]);

  const speciesCount = useMemo(() => pokemonList.filter((p) => !p.isForm).length, [pokemonList]);

  const advancedCount = useMemo(
    () => activeFilters.filter((f) => ADVANCED_TYPES.has(f.type)).length,
    [activeFilters],
  );

  const handleSelect = useCallback((name) => {
    setSelectedPokemon(name);
    recordView(name);
  }, [recordView]);

  // Sem login, o coração leva ao cadastro em vez de falhar em silêncio.
  const handleToggleFavorite = useCallback(
    (name) => (session ? toggleFavorite(name) : setAuthOpen(true)),
    [session, toggleFavorite],
  );

  const collectionCounts = useMemo(
    () => ({ favorites: collections.favorites.length, history: collections.history.length }),
    [collections.favorites, collections.history],
  );
  const handleCloseModal = useCallback(() => setSelectedPokemon(null), []);
  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const openBuilder = useCallback(() => setBuilderOpen(true), []);
  const closeBuilder = useCallback(() => setBuilderOpen(false), []);
  const openAbout = useCallback(() => setAboutOpen(true), []);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-[#FFFEFB] flex items-center justify-center border-2 border-[#4A3B32]/20 shadow-sm">
            <img src={officialSpriteUrl(SMEARGLE_ID)} alt="Smeargle" width={32} height={32} decoding="async" className="w-8 h-8 object-contain" />
          </div>
          <p className="font-hand text-xl text-[#78614E]">Folheando o manual de campo...</p>
        </div>
      </div>
    );
  }

  // Numa coleção sem login, carregando, com falha ou vazia, um aviso ocupa o lugar da grade.
  const collectionBlocked = view !== "all" && (collections.status !== "ready" || baseList.length === 0);
  const count = collectionBlocked ? 0 : filteredList.length;
  const plural = count !== 1 ? "s" : "";

  return (
    <div className="relative min-h-screen">
      <PageVignette />
      <AuthModal open={authOpen} onClose={closeAuth} onAuthChange={setSession} />
      {aboutOpen && <AboutModal onClose={closeAbout} />}
      {builderOpen && (
        <TeamBuilderModal onClose={closeBuilder} team={team} onTeamChange={setTeam} pool={pokemonList} session={session} />
      )}

      <header
        className={`sticky top-0 z-40 text-[#F7F3EE] border-b border-[#261A13]/60 ${EASE} ${
          collapsed ? HEADER_SURFACE.collapsed : HEADER_SURFACE.expanded
        }`}
      >
        <InkSplatter className="hidden md:block absolute -top-6 right-[8%] w-36 h-36 opacity-[0.14] mix-blend-multiply rotate-12" color="#2A1C14" />
        <InkSplatter className="hidden md:block absolute -bottom-10 left-[22%] w-24 h-24 opacity-[0.16] -rotate-45" color="#A4C294" />

        <div className={`relative max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 ${EASE} ${collapsed ? "py-2" : "py-2 sm:py-4"}`}>
          {/*
            Logotipo à esquerda, ações à direita e a barra de pesquisa/filtros como bloco central de largura limitada.
            Abaixo de 2xl a barra desce para uma 2ª linha, centrada; em 2xl as três zonas ficam numa grade.
          */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-4 sm:gap-y-3 2xl:grid 2xl:grid-cols-[auto_minmax(0,1fr)_auto] 2xl:gap-6">
            <div className="order-1 flex min-w-0 items-center gap-3 sm:shrink-0">
              <div className={`hidden shrink-0 overflow-hidden md:block ${EASE} ${collapsed ? "w-0 opacity-0 -mr-4" : "w-16 opacity-100"}`}>
                <SmeargleMascote />
              </div>
              <div className={`relative isolate min-w-0 ${EASE} ${collapsed ? "px-3 py-1" : "px-3 py-1 sm:px-4 sm:py-2"}`}>
                <InkSplash />
                <h1 className={`font-black font-serif tracking-tight leading-none text-[#FFFDF9] [text-shadow:0_1px_2px_rgba(38,26,19,0.35)] ${EASE} ${collapsed ? "text-lg sm:text-xl" : "text-xl sm:text-3xl"}`}>
                  Smeargle<span className="text-[#B7D99F]">pedia</span>
                </h1>
                <p className={`hidden sm:block overflow-hidden text-[11px] uppercase tracking-wider font-bold text-[#FFFDF9]/80 ${EASE} ${collapsed ? "max-h-0 opacity-0 mt-0" : "max-h-5 opacity-100 mt-1"}`}>
                  Pokédex • Filtros • Detalhes Smogon
                </p>
              </div>
            </div>

            <div className="order-3 mx-auto w-full max-w-4xl min-w-0 rounded-2xl border border-[#F7F3EE]/15 bg-[#2A1C14]/20 p-1.5 shadow-inner 2xl:order-2 2xl:max-w-3xl">
              <FiltersBar
                onSearchChange={setSearchTerm}
                onAddFilter={addFilter}
                advancedOpen={advancedOpen}
                advancedCount={advancedCount}
                onToggleAdvanced={toggleAdvanced}
                compact={collapsed}
              />
            </div>

            <div className="order-2 ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0 2xl:order-3">
              <TeamBuilderButton onClick={openBuilder} count={team.length} />
              <AuthButton session={session} onOpen={openAuth} />
              <AboutButton onClick={openAbout} />
            </div>
          </div>

          {advancedOpen && <AdvancedFilters eggGroups={eggGroupNames} onAddFilter={addFilter} />}
        </div>

        <TornEdge className={`absolute left-0 top-full -mt-px text-[#78614E] ${EASE} ${collapsed ? "opacity-[0.88]" : "opacity-[0.96]"}`} />
      </header>

      <main className="relative max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16">
        <InkSplatter className="hidden md:block absolute -left-10 top-24 w-40 h-40 opacity-[0.07] mix-blend-multiply -rotate-12" color="#785132" />
        <InkSplatter className="hidden md:block absolute right-0 bottom-40 w-28 h-28 opacity-[0.08] mix-blend-multiply rotate-[160deg]" color="#829b72" />

        <div className="relative space-y-6">
          <ActiveFilters activeFilters={activeFilters} filterStatus={filterStatus} onRemoveFilter={removeFilter} />

          <CollectionTabs
            view={view}
            onChange={setView}
            counts={collectionCounts}
            onClearHistory={collections.clearHistory}
            error={collections.error}
          />

          <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
            <div>
              <p className="font-hand text-xl leading-none text-[#78614E] -rotate-1">{COLLECTIONS[view].caption}</p>
              <h2 className="mt-1 text-2xl font-black font-serif text-[#2A2421] tracking-tight">
                <span className="ink-splotch tabular-nums">{count}</span> Pokémon{plural} encontrado{plural}
              </h2>
              {searchTerm && (
                <p className="mt-1 text-sm text-[#78614E]">
                  Resultado para <span className="font-serif italic">“{searchTerm}”</span>
                </p>
              )}
            </div>
            <span className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-full bg-[#FFFEFB] border border-[#4A3B32]/15 font-serif font-semibold text-[#78614E] shadow-xs">
              Até Gen 9 · {speciesCount} espécies · {pokemonList.length - speciesCount} formas
            </span>
          </Reveal>

          <Reveal delay={120} className="organic-divider !my-2" />

          {collectionBlocked ? (
            <CollectionNotice view={view} status={collections.status} isEmpty={baseList.length === 0} onLogin={openAuth} />
          ) : (
            <PokemonGrid
              pokemonList={filteredList}
              selectedName={selectedPokemon}
              onSelect={handleSelect}
              hasSmogonDataMap={hasSmogonDataMap}
              favorites={collections.favoriteSet}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        </div>
      </main>

      {selectedPokemon && (
        <div
          className="fixed inset-0 bg-[#261A13]/60 md:bg-[#261A13]/45 md:backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={handleCloseModal}
        >
          <div
            className="bg-[#FFFEFB] w-full max-w-5xl h-[90vh] sm:h-[85vh] rounded-[2rem] shadow-xl md:shadow-2xl overflow-hidden flex flex-col border border-[#4A3B32]/20"
            onClick={(e) => e.stopPropagation()}
          >
            <PokemonDrawer
              pokemonName={selectedPokemon}
              onClose={handleCloseModal}
              onSmogonDataFound={markSmogonData}
              favorites={collections.favoriteSet}
              gridEntries={entryByName}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        </div>
      )}
    </div>
  );
}
