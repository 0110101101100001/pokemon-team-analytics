import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, Loader2, NotebookPen, Search, SlidersHorizontal, TriangleAlert, X } from 'lucide-react';
import GameOptions from './GameOptions';
import { BrushUnderline } from './InkDecor';
import {
  HEADER_BUTTON_CLASS, HeaderSegmented, HeaderSelect, OPTION_CLASS, TEXT_INPUT_BASE, TEXT_INPUT_CLASS,
} from './layout/HeaderControls';
import { GAMES } from '../data/games';
import { TYPE_NAMES, fetchAbilityNames, fetchMoveNames } from '../services/api';
import { FIXED_FILTERS, GENERATIONS, createFilter, eggGroupLabel, filterKey, formatSlug } from '../utils/filters';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { SORTS, VIEWS } from '../utils/pokedexView';

const VIEW_ICONS = { grid: LayoutGrid, list: List };
// No celular os selects de filtro dividem a linha em três (6 colunas, 2 cada); do sm em diante, uma coluna cada.
const NARROW = 'col-span-2 sm:col-span-1 xl:w-40 xl:shrink-0';

/** Grade ou Lista: dois botões com ícone e aria-pressed, no traço dos botões do header. */
function ViewToggle({ value, onChange, className = '' }) {
  return (
    <div role="group" aria-label="Visualização" className={`flex h-9 shrink-0 overflow-hidden rounded-[3px] border-[1.5px] border-header-ink/55 bg-header-solid sm:h-10 ${className}`}>
      {VIEWS.map((option) => {
        const Icon = VIEW_ICONS[option.value];
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={`relative inline-flex flex-1 cursor-pointer items-center justify-center text-header-ink sm:w-10 sm:flex-none transition-colors focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-paint-pistachio/70 sm:w-10 ${
              selected ? 'bg-header-ink/20' : 'hover:bg-header-ink/10'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={selected ? 2.5 : 2} aria-hidden="true" />
            <BrushUnderline color="var(--header-underline)" active={selected} className="inset-x-2 bottom-0.5 h-[3px] w-[calc(100%-1rem)]" />
          </button>
        );
      })}
    </div>
  );
}

const SEARCH_DEBOUNCE_MS = 150;

const SCOPES = [
  { value: 'national', label: 'Nacional' },
  { value: 'regional', label: 'Regional' },
];

/**
 * Campo com sugestões (datalist) para listas longas. As opções só são buscadas no primeiro foco.
 * Adiciona o filtro ao escolher uma sugestão ou ao pressionar Enter com um nome válido.
 */
// O campo com datalist ganha uma seta nativa à direita, desenhada por cima do texto; fica escondida,
// e o espaço à direita é reservado para o indicador de carregamento.
const SUGGEST_INPUT_CLASS = `${TEXT_INPUT_BASE} pr-9 text-ellipsis [&::-webkit-calendar-picker-indicator]:!hidden`;

const SuggestInput = memo(function SuggestInput({ id, label, placeholder, loadOptions, onPick }) {
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');

  const slugByLabel = useMemo(
    () => new Map((options ?? []).map((slug) => [formatSlug(slug).toLowerCase(), slug])),
    [options],
  );

  const handleFocus = useCallback(() => {
    if (options || loading) return;
    setLoading(true);
    loadOptions().then(setOptions).catch(() => setOptions([])).finally(() => setLoading(false));
  }, [options, loading, loadOptions]);

  const commit = useCallback((raw) => {
    const slug = slugByLabel.get(raw.trim().toLowerCase());
    if (!slug) return false;
    onPick(slug);
    setValue('');
    return true;
  }, [slugByLabel, onPick]);

  const handleChange = useCallback((e) => {
    const next = e.target.value;
    setValue(next);
    // Escolher uma sugestão da datalist não gera inputType (Chrome) ou gera insertReplacementText (Firefox).
    const inputType = e.nativeEvent.inputType;
    if (!inputType || inputType === 'insertReplacementText') commit(next);
  }, [commit]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(value);
    }
  }, [commit, value]);

  return (
    <label className="relative block w-full min-w-0">
      <Search className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-header-ink/85" aria-hidden="true" />
      <input
        type="text"
        list={id}
        value={value}
        onFocus={handleFocus}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={label}
        aria-busy={loading}
        autoComplete="off"
        className={SUGGEST_INPUT_CLASS}
      />
      {loading && (
        <Loader2
          className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-header-ink/85"
          aria-label="carregando sugestões"
        />
      )}
      <datalist id={id}>
        {options?.map((slug) => <option key={slug} value={formatSlug(slug)} />)}
      </datalist>
    </label>
  );
});

function FiltersBar({
  initialQuery = '',
  onSearchChange,
  onAddFilter,
  scope,
  onScopeChange,
  gameId,
  onGameChange,
  advancedOpen,
  advancedCount,
  onToggleAdvanced,
  sort,
  onSortChange,
  view,
  onViewChange,
  compact = false,
}) {
  // A barra é desmontada ao sair da aba Pokédex; `initialQuery` devolve o texto da busca na volta.
  const [query, setQuery] = useState(initialQuery);
  // O campo responde a cada tecla; a lista só é refiltrada quando a digitação pausa.
  // Esvaziar o campo propaga na hora, para limpar a busca sem esperar.
  const debouncedQuery = useDebouncedValue(query, query ? SEARCH_DEBOUNCE_MS : 0);
  useEffect(() => { onSearchChange(debouncedQuery); }, [debouncedQuery, onSearchChange]);

  const handleSearch = useCallback((e) => setQuery(e.target.value), []);

  const handleSelect = useCallback((type) => (e) => {
    if (e.target.value) onAddFilter(createFilter(type, e.target.value));
    e.target.value = '';
  }, [onAddFilter]);

  const handleGame = useCallback((e) => onGameChange(e.target.value), [onGameChange]);
  const handleSort = useCallback((e) => onSortChange(e.target.value), [onSortChange]);

  // Até xl: recorte e busca numa linha e, na de baixo, Geração, Tipo, Avançados, Ordenar e Grade/Lista, para a busca
  // nunca ficar espremida. No celular essa segunda linha se recolhe ao rolar (`compact`), a não ser que os filtros
  // avançados estejam abertos. xl+ (1280px): tudo numa linha só; abaixo disso a busca ficaria espremida (os wrappers viram `contents` e somem do layout).
  const filtersHidden = compact && !advancedOpen;
  const regional = scope === 'regional';

  return (
    <div className="flex w-full flex-col xl:flex-row xl:items-center xl:gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2 xl:contents">
        <HeaderSegmented label="Recorte da Pokédex" options={SCOPES} value={scope} onChange={onScopeChange} className="shrink-0" />
        <label className="relative w-full min-w-0 xl:flex-1">
          <Search className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-header-ink/85" aria-hidden="true" />
          <input
            type="search"
            className={TEXT_INPUT_CLASS}
            placeholder={regional ? 'Nome ou número regional...' : 'Nome ou número (ex.: 25)...'}
            aria-label={`Pesquisar Pokémon por nome ou número da Pokédex ${regional ? 'regional' : 'nacional'}`}
            value={query}
            onChange={handleSearch}
          />
        </label>
      </div>

      <div
        className={`grid grid-cols-6 gap-1.5 transition-[max-height,opacity,margin] duration-200 motion-reduce:transition-none max-sm:overflow-hidden sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:gap-2 sm:max-xl:mt-2 xl:contents ${
          filtersHidden ? 'max-sm:invisible max-sm:mt-0 max-sm:max-h-0 max-sm:opacity-0' : 'max-sm:mt-1.5 max-sm:max-h-[5.25rem]'
        }`}
      >
      {regional ? (
        <HeaderSelect label="Jogo da Pokédex regional" value={gameId} onChange={handleGame} className={NARROW}>
          <GameOptions games={GAMES} />
        </HeaderSelect>
      ) : (
        <HeaderSelect label="Filtrar por geração" placeholder="Geração" onChange={handleSelect('generation')} className={NARROW}>
          {GENERATIONS.map((gen) => (
            <option key={gen.value} value={gen.value} className={OPTION_CLASS}>{gen.label}</option>
          ))}
        </HeaderSelect>
      )}

      <HeaderSelect label="Filtrar por tipo" placeholder="Tipo" onChange={handleSelect('type')} className={NARROW}>
        {TYPE_NAMES.map((type) => (
          <option key={type} value={type} data-type={type} className={OPTION_CLASS}>{formatSlug(type)}</option>
        ))}
      </HeaderSelect>

      <button
        type="button"
        onClick={onToggleAdvanced}
        aria-expanded={advancedOpen}
        aria-controls="advanced-filters"
        aria-label={advancedCount > 0 ? `Filtros avançados (${advancedCount} ativos)` : 'Filtros avançados'}
        className={`${HEADER_BUTTON_CLASS} col-span-2 px-2 sm:col-span-1 sm:px-3 xl:shrink-0 ${advancedOpen ? 'border-paint-pistachio' : ''}`}
      >
        <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        Avançados
        {/* Texto pequeno: o tema pode trocar o tom de destaque do header por um com contraste (--header-accent-text). */}
        {advancedCount > 0 && (
          <span className="font-mono text-[11px] font-bold tabular-nums text-[color:var(--header-accent-text,var(--paint-pistachio))]">
            {advancedCount}
          </span>
        )}
        <BrushUnderline color="var(--header-underline)" active={advancedOpen} className="inset-x-3 bottom-1 h-[4px] w-[calc(100%-1.5rem)]" />
      </button>

      <HeaderSelect label="Ordenar Pokémon" value={sort} onChange={handleSort} className="col-span-4 sm:col-span-1 xl:w-44 xl:shrink-0">
        {SORTS.map((option) => (
          <option key={option.value} value={option.value} className={OPTION_CLASS}>
            {option.value === 'number' ? 'Ordenar: Nº' : option.label}
          </option>
        ))}
      </HeaderSelect>
      <ViewToggle value={view} onChange={onViewChange} className="col-span-2 sm:col-span-1" />
      </div>
    </div>
  );
}

// Selects de valores fixos do painel avançado, na ordem de exibição.
const FIXED_SELECTS = [
  { type: 'region', label: 'Filtrar por forma regional', placeholder: 'Forma regional' },
  { type: 'rarity', label: 'Filtrar por raridade', placeholder: 'Raridade' },
  { type: 'mega', label: 'Filtrar por Mega Evolução', placeholder: 'Mega Evolução' },
  { type: 'gmax', label: 'Filtrar por Gigantamax', placeholder: 'Gigantamax' },
];

function AdvancedFiltersComponent({ eggGroups, onAddFilter }) {
  const handleSelect = useCallback((type) => (e) => {
    if (e.target.value) onAddFilter(createFilter(type, e.target.value));
    e.target.value = '';
  }, [onAddFilter]);
  const handleEggGroup = handleSelect('eggGroup');
  const addBuilds = useCallback(() => onAddFilter(createFilter('builds', 'with')), [onAddFilter]);

  const addAbility = useCallback((slug) => onAddFilter(createFilter('ability', slug)), [onAddFilter]);
  const addMove = useCallback((slug) => onAddFilter(createFilter('move', slug)), [onAddFilter]);

  return (
    <div id="advanced-filters" className="mt-1.5 border-t border-header-ink/15 pt-1.5">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
        <SuggestInput
          id="ability-options"
          label="Filtrar por habilidade"
          placeholder="Habilidade (ex.: Levitate)"
          loadOptions={fetchAbilityNames}
          onPick={addAbility}
        />
        <SuggestInput
          id="move-options"
          label="Filtrar por golpe que aprende"
          placeholder="Golpe (ex.: Earthquake)"
          loadOptions={fetchMoveNames}
          onPick={addMove}
        />
        <HeaderSelect label="Filtrar por grupo de ovos" placeholder="Grupo de ovos" onChange={handleEggGroup} className="">
          {eggGroups.map((name) => (
            <option key={name} value={name} className={OPTION_CLASS}>{eggGroupLabel(name)}</option>
          ))}
        </HeaderSelect>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:mt-2 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5">
        {FIXED_SELECTS.map(({ type, label, placeholder }) => (
          <HeaderSelect key={type} label={label} placeholder={placeholder} onChange={handleSelect(type)} className="">
            {FIXED_FILTERS[type].map(({ value, option }) => (
              <option key={value} value={value} className={OPTION_CLASS}>{option}</option>
            ))}
          </HeaderSelect>
        ))}
        <button
          type="button"
          onClick={addBuilds}
          className={`${HEADER_BUTTON_CLASS} col-span-2 lg:col-span-1`}
        >
          <NotebookPen className="w-4 h-4 shrink-0" aria-hidden="true" />
          Com build da Smogon
        </button>
      </div>

      <p className="mt-2 px-1 pb-0.5 font-hand text-base leading-tight text-header-ink/90">
        gerações, regiões e raridades se somam dentro do grupo (ou); os demais filtros precisam ser todos atendidos (e).
      </p>
    </div>
  );
}

const FILTER_STATUS_ICON = {
  loading: <Loader2 className="w-3 h-3 animate-spin text-umber" aria-label="carregando" />,
  error: <TriangleAlert className="w-3 h-3 text-danger" aria-label="falha ao carregar; filtro ignorado" />,
};

function ActiveFiltersComponent({ activeFilters, filterStatus, onRemoveFilter }) {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-reading text-sm italic text-ink-soft">Filtros ativos:</span>
      {activeFilters.map((filter) => {
        const key = filterKey(filter);
        const status = filterStatus[key];
        const failed = status === 'error';
        return (
          <div
            key={key}
            title={failed ? 'Não foi possível carregar este filtro; está sendo ignorado.' : undefined}
            className={`flex items-center gap-1.5 rounded-[2px] border-[1.5px] py-0.5 pl-2.5 pr-0.5 font-reading text-sm ${
              failed ? 'border-danger/60 text-danger' : 'border-ink/70 text-ink'
            }`}
          >
            {FILTER_STATUS_ICON[status]}
            <span>{filter.label}</span>
            <button
              type="button"
              onClick={() => onRemoveFilter(key)}
              aria-label={`Remover ${filter.label}`}
              className="inline-flex items-center justify-center w-5 h-5 rounded-[2px] text-umber transition-colors cursor-pointer hover:bg-ink-soft/15 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
            >
              <X className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export const AdvancedFilters = memo(AdvancedFiltersComponent);
export const ActiveFilters = memo(ActiveFiltersComponent);
export default memo(FiltersBar);
