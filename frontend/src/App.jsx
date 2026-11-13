import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import AuthModal from "./components/AuthModal";
import AuthButton from "./components/AuthButton";
import AboutButton from "./components/AboutButton";
import AppHeader from "./components/layout/AppHeader";
import InkDropLoader from "./components/InkDropLoader";
import PokemonSheet, { loadPokemonDrawer } from "./components/PokemonSheet";
import { HeaderContext } from "./components/layout/headerContext";
import { InkSplatter } from "./components/InkDecor";
import PokedexSection from "./sections/PokedexSection";
import { sectionFromPath } from "./navigation/sections";
import { useHashPath } from "./hooks/useHashPath";
import { usePokedexFilters } from "./hooks/usePokedexFilters";
import { useScrollCollapsed } from "./hooks/useScrollCollapsed";
import { useUserCollections } from "./hooks/useUserCollections";
import {
  fetchEggGroupIndex, fetchPokemonList, fetchSmogonNames, fetchSpeciesList, fetchTypeIndex, officialSpriteUrl,
} from "./services/api";
import { buildPokedexEntries } from "./utils/pokedex";
import { buildSmogonBadgeMap } from "./utils/smogon";

// A Pokédex é a tela de entrada; as outras seções só são baixadas quando a aba é aberta.
const ItemsSection = lazy(() => import("./sections/ItemsSection"));
const GymLeadersSection = lazy(() => import("./sections/GymLeadersSection"));
const TeamBuilderSection = lazy(() => import("./sections/TeamBuilderSection"));
const DamageCalculatorSection = lazy(() => import("./sections/DamageCalculatorSection"));
// O "Sobre" e a ficha (em PokemonSheet) só abrem por ação do usuário: ficam fora do pacote inicial.
const AboutModal = lazy(() => import("./components/AboutModal"));

const SMEARGLE_ID = 235;
const APP_NAME = "Smearglepedia";

function SectionFallback() {
  return <InkDropLoader label="Molhando o pincel..." className="py-24" />;
}

export default function App() {
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [eggGroupNames, setEggGroupNames] = useState([]);
  const [hasSmogonDataMap, setHasSmogonDataMap] = useState({});
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [team, setTeam] = useState([]);
  // Nó do header onde a seção ativa desenha os próprios filtros (ver HeaderToolbar).
  const [toolbarSlot, setToolbarSlot] = useState(null);

  const section = sectionFromPath(useHashPath());
  const collections = useUserCollections(session);
  const { toggleFavorite, recordView } = collections;
  const pokedex = usePokedexFilters(pokemonList);
  const collapsed = useScrollCollapsed();

  const markSmogonData = useCallback((name) => {
    setHasSmogonDataMap((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
  }, []);

  useEffect(() => {
    let active = true;
    // Espécies base + formas regionais/alternativas; Megas e Gigantamax ficam no drawer.
    // /pokemon?limit=2000 já traz todas as varieties numa só requisição (evita 1025 requisições a /pokemon-species).
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
        // Com a grade pronta, a ficha é baixada em segundo plano: o primeiro clique já abre na hora.
        (window.requestIdleCallback ?? setTimeout)(() => loadPokemonDrawer().catch(() => {}));

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

  // Cada aba abre do topo e dá nome à guia do navegador.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${section.label} · ${APP_NAME}`;
    document.documentElement.style.setProperty("--section-wash", section.pigment);
  }, [section]);

  const entryByName = useMemo(() => new Map(pokemonList.map((p) => [p.name, p])), [pokemonList]);
  const headerContext = useMemo(() => ({ slot: toolbarSlot, collapsed }), [toolbarSlot, collapsed]);

  const handleSelect = useCallback((name) => {
    setSelectedPokemon(name);
    recordView(name);
  }, [recordView]);

  // Sem login, o coração leva ao cadastro em vez de falhar em silêncio.
  const handleToggleFavorite = useCallback(
    (name) => (session ? toggleFavorite(name) : setAuthOpen(true)),
    [session, toggleFavorite],
  );

  const handleCloseModal = useCallback(() => setSelectedPokemon(null), []);
  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const openAbout = useCallback(() => setAboutOpen(true), []);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <img src={officialSpriteUrl(SMEARGLE_ID)} alt="" width={72} height={72} decoding="async" className="h-[72px] w-[72px] object-contain" />
        <InkDropLoader label="Preparando a tinta..." />
      </div>
    );
  }

  const renderSection = () => {
    switch (section.id) {
      case "items":
        return <ItemsSection />;
      case "gymLeaders":
        return <GymLeadersSection entryByName={entryByName} onSelectPokemon={handleSelect} />;
      case "teamBuilder":
        return (
          <TeamBuilderSection
            team={team}
            onTeamChange={setTeam}
            pool={pokemonList}
            session={session}
            collections={collections}
            entryByName={entryByName}
            onLogin={openAuth}
          />
        );
      case "damageCalculator":
        return <DamageCalculatorSection pool={pokemonList} team={team} />;
      default:
        return (
          <PokedexSection
            pokedex={pokedex}
            pokemonList={pokemonList}
            eggGroupNames={eggGroupNames}
            collections={collections}
            selectedName={selectedPokemon}
            hasSmogonDataMap={hasSmogonDataMap}
            onSelect={handleSelect}
            onToggleFavorite={handleToggleFavorite}
            onLogin={openAuth}
          />
        );
    }
  };

  return (
    <HeaderContext.Provider value={headerContext}>
      <div className="relative min-h-screen">
        <AuthModal open={authOpen} onClose={closeAuth} onAuthChange={setSession} />
        {aboutOpen && (
          <Suspense fallback={null}>
            <AboutModal onClose={closeAbout} />
          </Suspense>
        )}

        <AppHeader activeId={section.id} collapsed={collapsed} toolbarRef={setToolbarSlot}>
          <AuthButton session={session} onOpen={openAuth} />
          <AboutButton onClick={openAbout} />
        </AppHeader>

        <main className="relative max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16">
          <InkSplatter className="hidden md:block absolute -left-24 top-[22rem] w-44 h-44 opacity-[0.06] mix-blend-multiply -rotate-12" color="#785132" />
          <InkSplatter className="hidden md:block absolute right-0 bottom-40 w-28 h-28 opacity-[0.08] mix-blend-multiply rotate-[160deg]" color="#829b72" />

          <div key={section.id} className="relative animate-section-in motion-reduce:animate-none">
            <Suspense fallback={<SectionFallback />}>{renderSection()}</Suspense>
          </div>
        </main>

        {selectedPokemon && (
          <PokemonSheet
            pokemonName={selectedPokemon}
            onClose={handleCloseModal}
            onSmogonDataFound={markSmogonData}
            favorites={collections.favoriteSet}
            gridEntries={entryByName}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </div>
    </HeaderContext.Provider>
  );
}
