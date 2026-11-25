import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthModal from "./components/AuthModal";
import AuthButton from "./components/AuthButton";
import AboutButton from "./components/AboutButton";
import BackToTopButton from "./components/BackToTopButton";
import CompareTray from "./components/compare/CompareTray";
import Toast from "./components/Toast";
import AppHeader from "./components/layout/AppHeader";
import SmeargleLoader from "./components/SmeargleLoader";
import PokemonSheet, { loadPokemonDrawer } from "./components/PokemonSheet";
import { HeaderContext } from "./components/layout/headerContext";
import { InkSplatter } from "./components/InkDecor";
import PokedexSection from "./sections/PokedexSection";
import { sectionFromPath } from "./navigation/sections";
import { useHashOverlay, useHashRoute } from "./hooks/useHashPath";
import { formatHash } from "./navigation/hashRoute";
import { usePokedexFilters } from "./hooks/usePokedexFilters";
import { useScrollCollapsed } from "./hooks/useScrollCollapsed";
import { useUserCollections } from "./hooks/useUserCollections";
import {
  fetchEggGroupIndex, fetchPokemonList, fetchSpeciesList, fetchTypeIndex,
} from "./services/api";
import { fetchSmogonNames } from "./services/smogonMeta";
import { buildPokedexEntries } from "./utils/pokedex";
import { buildSmogonBadgeMap } from "./utils/smogon";
import { COMPARE_LIMIT, toggleCompared } from "./utils/compare";
import { formatSlug } from "./utils/filters";
import { createBattleSet } from "./utils/stats";
import { TEAM_SIZE, speciesOf, teamSlotFor } from "./utils/teamScore";

// A Pokédex é a tela de entrada; as outras seções só são baixadas quando a aba é aberta.
const MovesSection = lazy(() => import("./sections/MovesSection"));
const AbilitiesSection = lazy(() => import("./sections/AbilitiesSection"));
const ItemsSection = lazy(() => import("./sections/ItemsSection"));
const TrainersSection = lazy(() => import("./sections/TrainersSection"));
const TeamBuilderSection = lazy(() => import("./sections/TeamBuilderSection"));
const DamageCalculatorSection = lazy(() => import("./sections/DamageCalculatorSection"));
// O "Sobre" e a ficha (em PokemonSheet) só abrem por ação do usuário: ficam fora do pacote inicial.
const AboutModal = lazy(() => import("./components/AboutModal"));
const CompareModal = lazy(() => import("./components/compare/CompareModal"));

const APP_NAME = "Smearglepedia";
const POKEMON_PARAM = "pokemon";

function SectionFallback() {
  return <SmeargleLoader label="Molhando o pincel..." className="py-24" />;
}

export default function App() {
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eggGroupNames, setEggGroupNames] = useState([]);
  const [hasSmogonDataMap, setHasSmogonDataMap] = useState({});
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [team, setTeam] = useState([]);
  const [compared, setCompared] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [toast, setToast] = useState(null);
  // A lista atual para o callback de comparação, que fica estável: os cards da grade não re-renderizam a cada toque.
  const comparedRef = useRef(compared);
  comparedRef.current = compared;
  const comparedSet = useMemo(() => new Set(compared), [compared]);
  // Nó do header onde a seção ativa desenha os próprios filtros (ver HeaderToolbar).
  const [toolbarSlot, setToolbarSlot] = useState(null);

  const route = useHashRoute();
  const section = sectionFromPath(route.segments[0]);
  // A ficha aberta mora no endereço (`?pokemon=garchomp`): o link abre a ficha e o botão voltar a fecha.
  const selectedPokemon = route.params.get(POKEMON_PARAM);
  const sheet = useHashOverlay(Boolean(selectedPokemon));
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

  // Cada aba abre do topo e pinta o fundo com a sua tinta.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.style.setProperty("--section-wash", section.pigment);
  }, [section]);

  // A guia do navegador leva o nome da ficha aberta ou da aba.
  useEffect(() => {
    const page = selectedPokemon ? formatSlug(selectedPokemon) : section.label;
    document.title = `${page} · ${APP_NAME}`;
  }, [section, selectedPokemon]);

  const entryByName = useMemo(() => new Map(pokemonList.map((p) => [p.name, p])), [pokemonList]);
  const headerContext = useMemo(() => ({ slot: toolbarSlot, collapsed }), [toolbarSlot, collapsed]);

  // O hash sem o parâmetro da ficha; os outros segmentos (o treinador aberto, por exemplo) continuam.
  const hashWithPokemon = useCallback((name) => {
    const params = new URLSearchParams(route.params);
    if (name) params.set(POKEMON_PARAM, name);
    else params.delete(POKEMON_PARAM);
    return formatHash(route.segments.length ? route.segments : [section.path], params);
  }, [route, section]);

  // Trocar de Pokémon com a ficha já aberta (evolução, forma) não empilha histórico: voltar fecha a ficha.
  const handleSelect = useCallback((name) => {
    sheet.open(hashWithPokemon(name), { replace: Boolean(selectedPokemon) });
    recordView(name);
  }, [sheet, hashWithPokemon, selectedPokemon, recordView]);
  const handleCloseModal = useCallback(() => sheet.close(hashWithPokemon(null)), [sheet, hashWithPokemon]);

  // Sem login, o coração leva ao cadastro em vez de falhar em silêncio.
  const handleToggleFavorite = useCallback(
    (name) => (session ? toggleFavorite(name) : setAuthOpen(true)),
    [session, toggleFavorite],
  );

  const notify = useCallback((message, { tone = "success", action = null } = {}) => {
    setToast({ id: Date.now(), message, tone, action });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const notifyProfileError = useCallback((message) => notify(message, { tone: "info" }), [notify]);

  // O botão da ficha alterna: a entrada da grade entra no time com um set vazio (como pelo Team Builder) ou,
  // se a espécie já está no time, sai dele. Um aviso confirma o que aconteceu.
  const handleToggleTeam = useCallback((entry) => {
    const name = formatSlug(entry.name);
    const slot = teamSlotFor(team, entry);
    if (slot === "taken") notify(`${name} saiu do time.`, { tone: "info" });
    else if (slot === "ok") notify(`${name} entrou no time (${team.length + 1}/${TEAM_SIZE}).`, { action: { label: "Ver time", href: "#/times" } });
    else notify(`O time já tem ${TEAM_SIZE} Pokémon.`, { tone: "info" });
    setTeam((current) => {
      const slot = teamSlotFor(current, entry);
      if (slot === 'taken') return current.filter((member) => speciesOf(member) !== speciesOf(entry));
      return slot === 'ok' ? [...current, { ...entry, set: createBattleSet() }] : current;
    });
  }, [team, notify]);

  const openCompare = useCallback(() => setCompareOpen(true), []);
  // Pelo aviso, a comparação abre no lugar da ficha, que ficaria por cima dela.
  const openCompareFromToast = useCallback(() => {
    handleCloseModal();
    setCompareOpen(true);
  }, [handleCloseModal]);

  // Comparação: a ficha e o card alternam o Pokémon na lista; dentro da comparação, o seletor só acrescenta.
  const toggleCompare = useCallback((pokemonName) => {
    const compared = comparedRef.current;
    const name = formatSlug(pokemonName);
    if (compared.includes(pokemonName)) {
      notify(`${name} saiu da comparação.`, { tone: "info" });
    } else if (compared.length >= COMPARE_LIMIT) {
      notify(`A comparação já tem ${COMPARE_LIMIT} Pokémon.`, { tone: "info" });
    } else {
      const count = compared.length + 1;
      notify(`${name} na comparação (${count}/${COMPARE_LIMIT}).`, {
        action: count >= 2 ? { label: "Comparar", onClick: openCompareFromToast } : null,
      });
    }
    setCompared((current) => toggleCompared(current, pokemonName));
  }, [notify, openCompareFromToast]);
  const addCompared = useCallback(
    (name) => setCompared((current) => (current.includes(name) ? current : toggleCompared(current, name))),
    [],
  );
  const removeCompared = useCallback((name) => setCompared((current) => current.filter((candidate) => candidate !== name)), []);
  const clearCompared = useCallback(() => {
    setCompared([]);
    setCompareOpen(false);
  }, []);
  const closeCompare = useCallback(() => setCompareOpen(false), []);

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
      case "abilities":
        return <AbilitiesSection entryByName={entryByName} onSelectPokemon={handleSelect} />;
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
        return <DamageCalculatorSection pool={pokemonList} team={team} session={session} onLogin={openAuth} />;
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
            comparedSet={comparedSet}
            onToggleCompare={toggleCompare}
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

        <AppHeader activeId={section.id} collapsed={collapsed} toolbarRef={setToolbarSlot} profilePool={pokemonList} profileUser={session?.user} onProfileError={notifyProfileError}
          onLogin={openAuth}
          accountAction={<AuthButton session={session} onOpen={openAuth} />}
        >
          <AboutButton onClick={openAbout} />
        </AppHeader>

        <main className="relative max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16">
          {/* Manchas de tinta nas margens, no accent e no secondary do tema, com pouca opacidade. */}
          <InkSplatter className="hidden md:block absolute -left-24 top-[22rem] w-44 h-44 -rotate-12" color="var(--splat-accent)" />
          <InkSplatter className="hidden md:block absolute -right-16 top-[max(14rem,38%)] w-32 h-32 rotate-45" color="var(--splat-secondary)" />
          <InkSplatter className="hidden md:block absolute -left-14 top-[max(34rem,62%)] w-24 h-24 rotate-[100deg]" color="var(--splat-secondary)" />
          <InkSplatter className="hidden md:block absolute right-0 top-[max(28rem,72%)] w-28 h-28 rotate-[160deg]" color="var(--splat-accent)" />
          <InkSplatter className="hidden md:block absolute -right-10 top-[max(38rem,92%)] w-20 h-20 -rotate-[30deg]" color="var(--splat-secondary)" />

          <div key={section.id} className="relative animate-section-in motion-reduce:animate-none">
            <Suspense fallback={<SectionFallback />}>{renderSection()}</Suspense>
          </div>
        </main>

        <BackToTopButton />
        <Toast toast={toast} onDismiss={dismissToast} />
        {!compareOpen && (
          <CompareTray names={compared} entryByName={entryByName} onRemove={removeCompared} onOpen={openCompare} />
        )}
        {compareOpen && (
          <Suspense fallback={null}>
            <CompareModal
              names={compared}
              entryByName={entryByName}
              pool={pokemonList}
              onAdd={addCompared}
              onRemove={removeCompared}
              onClear={clearCompared}
              onSelectPokemon={handleSelect}
              onClose={closeCompare}
            />
          </Suspense>
        )}

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
            compared={compared}
            onToggleCompare={toggleCompare}
            onSelectPokemon={handleSelect}
          />
        )}
      </div>
    </HeaderContext.Provider>
  );
}
