import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, NotebookPen, Search, SlidersHorizontal, TriangleAlert, X } from 'lucide-react';
import GameOptions from './GameOptions';
import {
  FIELD_CLASS, HeaderSegmented, HeaderSelect, OPTION_CLASS, TEXT_INPUT_BASE, TEXT_INPUT_CLASS,
} from './layout/HeaderControls';
import { GAMES } from '../data/games';
import { TYPE_NAMES, fetchAbilityNames, fetchMoveNames } from '../services/api';
import { FIXED_FILTERS, GENERATIONS, createFilter, eggGroupLabel, filterKey, formatSlug } from '../utils/filters';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 250;

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
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F7F3EE]/85" aria-hidden="true" />
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
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#F7F3EE]/85"
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

  // Até lg: recorte e busca numa linha e os três filtros lado a lado na de baixo, para a busca nunca ficar
  // espremida. No celular essa segunda linha se recolhe ao rolar (`compact`), a não ser que os filtros
  // avançados estejam abertos. lg+: tudo numa linha só (os wrappers viram `contents` e somem do layout).
  const filtersHidden = compact && !advancedOpen;
  const regional = scope === 'regional';

  return (
    <div className="flex w-full flex-col lg:flex-row lg:items-center lg:gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2 lg:contents">
        <HeaderSegmented label="Recorte da Pokédex" options={SCOPES} value={scope} onChange={onScopeChange} className="shrink-0" />
        <label className="relative w-full min-w-0 lg:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F7F3EE]/85" aria-hidden="true" />
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
        className={`grid grid-cols-3 gap-1.5 transition-[max-height,opacity,margin] duration-200 motion-reduce:transition-none max-sm:overflow-hidden sm:gap-2 sm:max-lg:mt-2 lg:contents ${
          filtersHidden ? 'max-sm:invisible max-sm:mt-0 max-sm:max-h-0 max-sm:opacity-0' : 'max-sm:mt-1.5 max-sm:max-h-10'
        }`}
      >
      {regional ? (
        <HeaderSelect label="Jogo da Pokédex regional" value={gameId} onChange={handleGame}>
          <GameOptions games={GAMES} />
        </HeaderSelect>
      ) : (
        <HeaderSelect label="Filtrar por geração" placeholder="Geração" onChange={handleSelect('generation')}>
          {GENERATIONS.map((gen) => (
            <option key={gen.value} value={gen.value} className={OPTION_CLASS}>{gen.label}</option>
          ))}
        </HeaderSelect>
      )}

      <HeaderSelect label="Filtrar por tipo" placeholder="Tipo" onChange={handleSelect('type')}>
        {TYPE_NAMES.map((type) => (
          <option key={type} value={type} className={OPTION_CLASS}>{formatSlug(type)}</option>
        ))}
      </HeaderSelect>

      <button
        type="button"
        onClick={onToggleAdvanced}
        aria-expanded={advancedOpen}
        aria-controls="advanced-filters"
        className={`relative h-9 sm:h-10 lg:shrink-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 rounded-xl border text-xs font-serif font-semibold tracking-wide transition-[background-color,border-color,box-shadow] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70 ${
          advancedOpen
            ? 'bg-[#A4C294] border-[#A4C294] text-[#2A1C14] shadow-[0_0_16px_-3px_rgba(164,194,148,0.7)]'
            : 'bg-[#3E2A1F]/90 border-[#F7F3EE]/30 text-[#F7F3EE] hover:border-[#F7F3EE]/50 hover:shadow-[0_0_16px_-6px_rgba(164,194,148,0.6)]'
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        Avançados
        {advancedCount > 0 && (
          <span className="min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-[#F7F3EE] text-[#2A1C14] text-[10px] font-sans font-bold">
            {advancedCount}
          </span>
        )}
      </button>
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
    <div id="advanced-filters" className="mt-1.5 border-t border-[#F7F3EE]/15 pt-1.5">
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
          className={`${FIELD_CLASS} col-span-2 inline-flex items-center justify-center gap-2 px-3 text-xs font-serif font-semibold tracking-wide cursor-pointer sm:col-span-2 lg:col-span-1`}
        >
          <NotebookPen className="w-4 h-4 shrink-0" aria-hidden="true" />
          Com build da Smogon
        </button>
      </div>

      <p className="mt-2 px-1 pb-0.5 font-hand text-base leading-tight text-[#F7F3EE]/70">
        gerações, regiões e raridades se somam dentro do grupo (ou); os demais filtros precisam ser todos atendidos (e).
      </p>
    </div>
  );
}

const FILTER_STATUS_ICON = {
  loading: <Loader2 className="w-3 h-3 animate-spin text-[#78614E]" aria-label="carregando" />,
  error: <TriangleAlert className="w-3 h-3 text-[#C15454]" aria-label="falha ao carregar; filtro ignorado" />,
};

function ActiveFiltersComponent({ activeFilters, filterStatus, onRemoveFilter }) {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[#4A3B32]">Filtros ativos</span>
      {activeFilters.map((filter) => {
        const key = filterKey(filter);
        const status = filterStatus[key];
        const failed = status === 'error';
        return (
          <div
            key={key}
            title={failed ? 'Não foi possível carregar este filtro; está sendo ignorado.' : undefined}
            className={`flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full border text-xs font-serif font-medium shadow-xs ${
              failed
                ? 'bg-[#C15454]/10 border-[#C15454]/40 text-[#9A3F3F]'
                : 'bg-[#EDE6DC] border-[#4A3B32]/20 text-[#2A2421]'
            }`}
          >
            {FILTER_STATUS_ICON[status]}
            <span>{filter.label}</span>
            <button
              type="button"
              onClick={() => onRemoveFilter(key)}
              aria-label={`Remover ${filter.label}`}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[#78614E] transition-colors cursor-pointer hover:bg-[#4A3B32]/15 hover:text-[#2A2421] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
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
