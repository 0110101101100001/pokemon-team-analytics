import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoadError from '../components/LoadError';
import { ActiveFilters } from '../components/FiltersBar';
import JumpIndex, { scrollToElement } from '../components/JumpIndex';
import SmeargleLoader from '../components/SmeargleLoader';
import TrainerCard from '../components/trainers/TrainerCard';
import TrainerModal from '../components/trainers/TrainerModal';
import { HeaderSearch, HeaderSelect, OPTION_CLASS } from '../components/layout/HeaderControls';
import HeaderToolbar from '../components/layout/HeaderToolbar';
import SectionHeading, { HEADING_PILL_CLASS, ResultCount } from '../components/layout/SectionHeading';
import { TYPE_NAMES } from '../services/api';
import { fetchTrainers } from '../services/trainers';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useHashOverlay, useHashRoute } from '../hooks/useHashPath';
import { formatHash } from '../navigation/hashRoute';
import { trainerHref } from '../navigation/sections';
import { formatSlug } from '../utils/filters';
import { usePreferences } from '../preferences/usePreferences';
import EmptyState from '../components/EmptyState';
import {
  FILTER_GROUPS, MIXED_TYPE, REGIONS, createNameMatcher, gamesOf, matchingBattles, regionGeneration, regionsOf, roleLabel, rolesOf,
} from '../utils/trainers';

const SEARCH_DEBOUNCE_MS = 200;
const NO_STATUS = {};
const EMPTY_FILTERS = Object.fromEntries(FILTER_GROUPS.map((group) => [group, []]));

const option = (value, label, type) => ({ value, label, type });

// Jogos e papéis vêm dos próprios treinadores; região e tipo têm opções fixas.
const filterSelects = (games, roles) => [
  { group: 'region', placeholder: 'Região', options: REGIONS.map((region) => option(region, region)) },
  { group: 'game', placeholder: 'Jogo', options: games.map((game) => option(game, game)) },
  {
    group: 'type',
    placeholder: 'Tipo',
    options: [...TYPE_NAMES.map((type) => option(type, formatSlug(type), type)), option(MIXED_TYPE, 'Vários tipos')],
  },
  { group: 'role', placeholder: 'Papel', options: roles.map((role) => option(role, roleLabel(role))) },
];

const HEADING_TITLE = 'Rumo à Liga';

function useTrainers() {
  const [state, setState] = useState({ status: 'loading', trainers: [] });
  const load = useCallback(() => {
    setState({ status: 'loading', trainers: [] });
    fetchTrainers()
      .then((trainers) => setState({ status: 'ready', trainers }))
      .catch(() => setState({ status: 'error', trainers: [] }));
  }, []);
  useEffect(load, [load]);
  return { ...state, retry: load };
}

export default function TrainersSection({ entryByName, onSelectPokemon }) {
  const { status, trainers, retry } = useTrainers();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, query ? SEARCH_DEBOUNCE_MS : 0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const games = useMemo(() => gamesOf(trainers), [trainers]);
  const selects = useMemo(() => filterSelects(games, rolesOf(trainers)), [games, trainers]);

  // O jogo padrão da conta (Configurações → Preferências) entra como filtro uma vez, quando a lista chega.
  const { values: preferences } = usePreferences();
  const preferredGameApplied = useRef(false);
  useEffect(() => {
    const game = preferences.default_league_game;
    if (preferredGameApplied.current || !game || !games.includes(game)) return;
    preferredGameApplied.current = true;
    setFilters((current) => (current.game.includes(game) ? current : { ...current, game: [...current.game, game] }));
  }, [games, preferences.default_league_game]);
  const labels = useMemo(() => Object.fromEntries(selects.map(({ group, options }) => [
    group,
    new Map(options.map(({ value, label }) => [value, label])),
  ])), [selects]);

  const visible = useMemo(() => {
    const matchesName = createNameMatcher(debouncedQuery);
    return trainers
      .filter(matchesName)
      .map((trainer) => ({ trainer, battles: matchingBattles(trainer, filters) }))
      .filter(({ battles }) => battles.length > 0);
  }, [trainers, debouncedQuery, filters]);

  // Cada treinador entra na região da primeira batalha que passou nos filtros.
  const byRegion = useMemo(() => regionsOf(visible.map(({ battles }) => battles[0]))
    .map((region) => ({ region, entries: visible.filter(({ battles }) => battles[0].region === region) })), [visible]);
  // As regiões seguem a ordem das gerações: Kanto é a 1ª, Hisui a 8ª, Paldea e Kitakami a 9ª.
  const jumpItems = useMemo(
    () => byRegion.map(({ region, entries }) => ({
      key: region, generation: regionGeneration(region) ?? entries[0].battles[0].generation, region,
    })),
    [byRegion],
  );
  const regionRefs = useRef(new Map());
  const jumpToRegion = useCallback((region) => scrollToElement(regionRefs.current.get(region)), []);

  const activeFilters = useMemo(() => FILTER_GROUPS.flatMap((group) =>
    filters[group].map((value) => ({ type: group, value, label: labels[group].get(value) ?? value }))), [filters, labels]);

  const addFilter = useCallback((group) => (e) => {
    const { value } = e.target;
    e.target.value = '';
    if (!value) return;
    setFilters((current) => (current[group].includes(value) ? current : { ...current, [group]: [...current[group], value] }));
  }, []);

  const removeFilter = useCallback((key) => {
    const separator = key.indexOf(':');
    const [group, value] = [key.slice(0, separator), key.slice(separator + 1)];
    setFilters((current) => ({ ...current, [group]: current[group].filter((item) => item !== value) }));
  }, []);

  // O treinador aberto mora no endereço (`#/treinadores/giovanni`), então o link abre a ficha dele.
  // Ela começa na primeira batalha que passou nos filtros; por link, na primeira do treinador.
  const route = useHashRoute();
  const openedSlug = route.segments[1] ?? null;
  const opened = useMemo(() => {
    const trainer = openedSlug && trainers.find((candidate) => candidate.slug === openedSlug);
    if (!trainer) return null;
    const entry = visible.find((candidate) => candidate.trainer === trainer);
    return { trainer, battleId: (entry ?? trainer).battles[0].id };
  }, [openedSlug, trainers, visible]);
  const trainerOverlay = useHashOverlay(Boolean(opened));
  const openTrainer = useCallback((slug) => trainerOverlay.open(trainerHref(slug)), [trainerOverlay]);
  const closeTrainer = useCallback(
    () => trainerOverlay.close(formatHash(route.segments.slice(0, 1))),
    [trainerOverlay, route],
  );

  const count = visible.length;

  return (
    <div className="space-y-6">
      <HeaderToolbar>
        <div className="flex w-full flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-2">
          <HeaderSearch
            label="Pesquisar treinador pelo nome"
            placeholder="Nome do treinador..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:contents">
            {selects.map(({ group, placeholder, options }) => (
              <HeaderSelect
                key={group}
                label={`Filtrar por ${placeholder.toLowerCase()}`}
                placeholder={placeholder}
                onChange={addFilter(group)}
                className="lg:w-36 lg:shrink-0"
              >
                {options.map(({ value, label, type }) => (
                  <option key={value} value={value} data-type={type} disabled={filters[group].includes(value)} className={OPTION_CLASS}>{label}</option>
                ))}
              </HeaderSelect>
            ))}
          </div>
        </div>
      </HeaderToolbar>

      <SectionHeading
        title={HEADING_TITLE}
        subtitle={status === 'ready' ? (
          <>
            Líderes, Elite 4 e campeões · <ResultCount count={count} singular="treinador" plural="treinadores" query={debouncedQuery} />
          </>
        ) : 'Líderes, Elite 4 e campeões de cada região'}
        aside={<span className={HEADING_PILL_CLASS}>Toque em um card para ver os times</span>}
      />

      {activeFilters.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <ActiveFilters activeFilters={activeFilters} filterStatus={NO_STATUS} onRemoveFilter={removeFilter} />
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="cursor-pointer font-reading text-sm italic text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:decoration-vermilion focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
            >
              limpar filtros
            </button>
          </div>
          <p className="font-reading text-sm italic text-brown">
            Opções do mesmo filtro se somam (ou); filtros diferentes valem juntos na mesma batalha.
          </p>
        </div>
      )}

      {status === 'loading' && <SmeargleLoader label="Chamando os treinadores..." className="py-16" />}

      {status === 'error' && (
        <LoadError message="Não foi possível carregar os treinadores." onRetry={retry} />
      )}

      {status === 'ready' && count === 0 && (
        <EmptyState title="nenhum treinador com esses filtros" hint="Ajuste a busca ou tire algum filtro." />
      )}

      {jumpItems.length > 1 && <JumpIndex label="Ir para a região" items={jumpItems} onJump={jumpToRegion} />}

      {byRegion.map(({ region, entries }) => (
        <section
          key={region}
          aria-label={region}
          ref={(node) => { if (node) regionRefs.current.set(region, node); else regionRefs.current.delete(region); }}
          className="scroll-mt-40"
        >
          <h3 className="section-title">{region}</h3>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entries.map(({ trainer }) => (
              <TrainerCard key={trainer.slug} trainer={trainer} entryByName={entryByName} onOpen={openTrainer} />
            ))}
          </ul>
        </section>
      ))}

      {opened && (
        <TrainerModal
          key={opened.trainer.slug}
          trainer={opened.trainer}
          initialBattleId={opened.battleId}
          entryByName={entryByName}
          onSelectPokemon={onSelectPokemon}
          onClose={closeTrainer}
        />
      )}
    </div>
  );
}
