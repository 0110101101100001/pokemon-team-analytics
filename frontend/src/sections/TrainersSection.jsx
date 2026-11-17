import { useCallback, useEffect, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { ActiveFilters } from '../components/FiltersBar';
import SmeargleLoader from '../components/SmeargleLoader';
import TrainerCard from '../components/trainers/TrainerCard';
import TrainerModal from '../components/trainers/TrainerModal';
import { HeaderSearch, HeaderSelect, OPTION_CLASS } from '../components/layout/HeaderControls';
import HeaderToolbar from '../components/layout/HeaderToolbar';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import { TYPE_NAMES } from '../services/api';
import { fetchTrainers } from '../services/trainers';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatSlug } from '../utils/filters';
import {
  FILTER_GROUPS, MIXED_TYPE, REGIONS, ROLES, createNameMatcher, gamesOf, matchingBattles, roleLabel,
} from '../utils/trainers';

const SEARCH_DEBOUNCE_MS = 200;
const NO_STATUS = {};
const EMPTY_FILTERS = Object.fromEntries(FILTER_GROUPS.map((group) => [group, []]));

const option = (value, label) => ({ value, label });

// Os jogos vêm dos próprios treinadores; os outros filtros têm opções fixas.
const filterSelects = (games) => [
  { group: 'region', placeholder: 'Região', options: REGIONS.map((region) => option(region, region)) },
  { group: 'game', placeholder: 'Jogo', options: games.map((game) => option(game, game)) },
  {
    group: 'type',
    placeholder: 'Tipo',
    options: [...TYPE_NAMES.map((type) => option(type, formatSlug(type))), option(MIXED_TYPE, 'Vários tipos')],
  },
  { group: 'role', placeholder: 'Papel', options: Object.keys(ROLES).map((role) => option(role, roleLabel(role))) },
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
  const [opened, setOpened] = useState(null);

  const selects = useMemo(() => filterSelects(gamesOf(trainers)), [trainers]);
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
  const byRegion = useMemo(() => REGIONS
    .map((region) => ({ region, entries: visible.filter(({ battles }) => battles[0].region === region) }))
    .filter(({ entries }) => entries.length > 0), [visible]);

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

  // A ficha abre na primeira batalha que passou nos filtros, não sempre na primeira do treinador.
  const openTrainer = useCallback((slug) => {
    const entry = visible.find(({ trainer }) => trainer.slug === slug);
    if (entry) setOpened({ trainer: entry.trainer, battleId: entry.battles[0].id });
  }, [visible]);
  const closeTrainer = useCallback(() => setOpened(null), []);

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
                {options.map(({ value, label }) => (
                  <option key={value} value={value} disabled={filters[group].includes(value)} className={OPTION_CLASS}>{label}</option>
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
            Líderes, Elite 4 e campeões · <span className="font-mono font-semibold tabular-nums text-[#2A2421]">{count}</span> treinador{count !== 1 ? 'es' : ''}
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
              className="cursor-pointer font-reading text-sm italic text-[#4A3B32] underline decoration-[#4A3B32]/40 underline-offset-2 hover:decoration-[#B8402A] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
            >
              limpar filtros
            </button>
          </div>
          <p className="font-reading text-sm italic text-[#785132]">
            Opções do mesmo filtro se somam (ou); filtros diferentes valem juntos na mesma batalha.
          </p>
        </div>
      )}

      {status === 'loading' && <SmeargleLoader label="Chamando os treinadores..." className="py-16" />}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="flex items-center gap-2 font-reading text-sm text-vermilion">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            Não foi possível carregar os treinadores.
          </p>
          <button type="button" onClick={retry} className="btn-outline">Tentar de novo</button>
        </div>
      )}

      {status === 'ready' && count === 0 && (
        <p className="py-16 text-center font-hand text-2xl text-[#78614E]">nenhum treinador com esses filtros</p>
      )}

      {byRegion.map(({ region, entries }) => (
        <section key={region} aria-label={region}>
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
