import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import AuthModal from "./components/AuthModal";
import AuthButton from "./components/AuthButton";
import AboutButton from "./components/AboutButton";
import BackToTopButton from "./components/BackToTopButton";
import AppHeader from "./components/layout/AppHeader";
import SmeargleLoader from "./components/SmeargleLoader";
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
  fetchEggGroupIndex, fetchPokemonList, fetchSpeciesList, fetchTypeIndex,
} from "./services/api";
import { fetchSmogonNames } from "./services/smogonMeta";
import { buildPokedexEntries } from "./utils/pokedex";
import { buildSmogonBadgeMap } from "./utils/smogon";
import { createBattleSet } from "./utils/stats";
import { speciesOf, teamSlotFor } from "./utils/teamScore";

// A Pokédex é a tela de entrada; as outras seções só são baixadas quando a aba é aberta.
const MovesSection = lazy(() => import("./sections/MovesSection"));
const ItemsSection = lazy(() => import("./sections/ItemsSection"));
const TrainersSection = lazy(() => import("./sections/TrainersSection"));
const TeamBuilderSection = lazy(() => import("./sections/TeamBuilderSection"));
const DamageCalculatorSection = lazy(() => import("./sections/DamageCalculatorSection"));
// O "Sobre" e a ficha (em PokemonSheet) só abrem por ação do usuário: ficam fora do pacote inicial.
const AboutModal = lazy(() => import("./components/AboutModal"));

const APP_NAME = "Smearglepedia";

function SectionFallback() {
  return <SmeargleLoader label="Molhando o pincel..." className="py-24" />;
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
    // A lista da Smogon vem do Supabase: não bloqueia a grade e, se falhar,
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

  // O botão da ficha alterna: a entrada da grade entra no time com um set vazio (como pelo Team Builder) ou,
  // se a espécie já está no time, sai dele.
  const handleToggleTeam = useCallback((entry) => {
    setTeam((current) => {
      const slot = teamSlotFor(current, entry);
      if (slot === 'taken') return current.filter((member) => speciesOf(member) !== speciesOf(entry));
      return slot === 'ok' ? [...current, { ...entry, set: createBattleSet() }] : current;
    });
  }, []);

  const handleCloseModal = useCallback(() => setSelectedPokemon(null), []);
  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const openAbout = useCallback(() => setAboutOpen(true), []);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SmeargleLoader label="Preparando a tinta..." />
      </div>
    );
  }

  const renderSection = () => {
    switch (section.id) {
      case "moves":
        return <MovesSection entryByName={entryByName} onSelectPokemon={handleSelect} />;
      case "items":
        return <ItemsSection entryByName={entryByName} onSelectPokemon={handleSelect} />;
      case "trainers":
        return <TrainersSection entryByName={entryByName} onSelectPokemon={handleSelect} />;
      case "teamBuilder":
        return (
          <TeamBuilderSection
            team={team}
            onTeamChange={setTeam}
            pool={pokemonList}
            session={session}
            collections={collections}
            entryByName={entryByName}
          />
        );
      case "damageCalculator":
        return <DamageCalculatorSection pool={pokemonList} team={team} session={session} />;
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
          {/* Manchas de tinta sólida nas margens, nas cores das manchas dos cards (grama, fogo, elétrico, água, voador). */}
          <InkSplatter className="hidden md:block absolute -left-24 top-[22rem] w-44 h-44 -rotate-12" color="#D0D2BA" />
          <InkSplatter className="hidden md:block absolute -right-16 top-[max(14rem,38%)] w-32 h-32 rotate-45" color="#E0C2AE" />
          <InkSplatter className="hidden md:block absolute -left-14 top-[max(34rem,62%)] w-24 h-24 rotate-[100deg]" color="#E9D9B3" />
          <InkSplatter className="hidden md:block absolute right-0 top-[max(28rem,72%)] w-28 h-28 rotate-[160deg]" color="#CAD1CE" />
          <InkSplatter className="hidden md:block absolute -right-10 top-[max(38rem,92%)] w-20 h-20 -rotate-[30deg]" color="#D3C5CF" />

          <div key={section.id} className="relative animate-section-in motion-reduce:animate-none">
            <Suspense fallback={<SectionFallback />}>{renderSection()}</Suspense>
          </div>
        </main>

        <BackToTopButton />

        {selectedPokemon && (
          <PokemonSheet
            pokemonName={selectedPokemon}
            onClose={handleCloseModal}
            onSmogonDataFound={markSmogonData}
            favorites={collections.favoriteSet}
            gridEntries={entryByName}
            onToggleFavorite={handleToggleFavorite}
            team={team}
            onToggleTeam={handleToggleTeam}
            onSelectPokemon={handleSelect}
          />
        )}
      </div>
    </HeaderContext.Provider>
  );
}
