import { memo, useCallback, useMemo, useState } from 'react';
import { ChevronDown, Loader2, Search, SlidersHorizontal, TriangleAlert, X } from 'lucide-react';
import { TYPE_NAMES, fetchAbilityNames, fetchMoveNames } from '../services/api';
import { GENERATIONS, createFilter, eggGroupLabel, filterKey, formatSlug } from '../utils/filters';

const FIELD_CLASS =
  'h-10 w-full rounded-xl border border-[#F7F3EE]/30 bg-[#3E2A1F]/90 text-[#F7F3EE] [color-scheme:dark] shadow-inner transition-colors hover:border-[#F7F3EE]/50 focus:outline-none focus:ring-2 focus:ring-[#A4C294]/70 focus:border-[#A4C294]';
const SELECT_CLASS = `${FIELD_CLASS} appearance-none pl-3 pr-9 text-xs font-serif font-semibold tracking-wide cursor-pointer`;
const TEXT_INPUT_CLASS = `${FIELD_CLASS} pl-9 pr-3 text-sm font-serif placeholder:italic placeholder:text-[#F7F3EE]/75`;
const OPTION_CLASS = 'bg-[#2A1C14] text-[#F7F3EE] font-sans';

// O placeholder é `hidden` e não `disabled`: uma opção disabled selecionada aparece a cinzento.
function HeaderSelect({ label, placeholder, onChange, className = 'sm:w-36 sm:shrink-0', children }) {
  return (
    <div className={`relative w-full ${className}`}>
      <select onChange={onChange} defaultValue="" aria-label={label} className={SELECT_CLASS}>
        <option value="" hidden>{placeholder}</option>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F7F3EE]/85"
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Campo com sugestões (datalist) para listas longas. As opções só são pedidas no primeiro foco.
 * Adiciona o filtro ao escolher uma sugestão ou ao carregar Enter com um nome válido.
 */
const SuggestInput = memo(function SuggestInput({ id, label, placeholder, loadOptions, onPick }) {
  const [options, setOptions] = useState(null);
  const [value, setValue] = useState('');

  const slugByLabel = useMemo(
    () => new Map((options ?? []).map((slug) => [formatSlug(slug).toLowerCase(), slug])),
    [options],
  );

  const handleFocus = useCallback(() => {
    if (options) return;
    loadOptions().then(setOptions).catch(() => setOptions([]));
  }, [options, loadOptions]);

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
    <label className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F7F3EE]/85" aria-hidden="true" />
      <input
        type="text"
        list={id}
        value={value}
        onFocus={handleFocus}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={options ? placeholder : `${placeholder.replace(/\.\.\.$/, '')} (a carregar…)`}
        aria-label={label}
        autoComplete="off"
        className={TEXT_INPUT_CLASS}
      />
      <datalist id={id}>
        {options?.map((slug) => <option key={slug} value={formatSlug(slug)} />)}
      </datalist>
    </label>
  );
});

function FiltersBar({ searchTerm, onSearchChange, onAddFilter, advancedOpen, advancedCount, onToggleAdvanced }) {
  const handleSearch = useCallback((e) => onSearchChange(e.target.value), [onSearchChange]);

  const handleSelect = useCallback((type) => (e) => {
    if (e.target.value) onAddFilter(createFilter(type, e.target.value));
    e.target.value = '';
  }, [onAddFilter]);

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <label className="relative w-full sm:min-w-0 sm:flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F7F3EE]/85" aria-hidden="true" />
        <input
          type="search"
          className={TEXT_INPUT_CLASS}
          placeholder="Nome ou número (ex.: 25)..."
          aria-label="Pesquisar Pokémon por nome ou número da Pokédex"
          value={searchTerm}
          onChange={handleSearch}
        />
      </label>

      <HeaderSelect label="Filtrar por geração" placeholder="Geração" onChange={handleSelect('generation')}>
        {GENERATIONS.map((gen) => (
          <option key={gen.value} value={gen.value} className={OPTION_CLASS}>{gen.label}</option>
        ))}
      </HeaderSelect>

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
        className={`relative h-10 shrink-0 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl border text-xs font-serif font-semibold tracking-wide transition-colors cursor-pointer ${
          advancedOpen
            ? 'bg-[#A4C294] border-[#A4C294] text-[#2A1C14]'
            : 'bg-[#3E2A1F]/90 border-[#F7F3EE]/30 text-[#F7F3EE] hover:border-[#F7F3EE]/50'
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
  );
}

function AdvancedFiltersComponent({ eggGroups, onAddFilter }) {
  const handleEggGroup = useCallback((e) => {
    if (e.target.value) onAddFilter(createFilter('eggGroup', e.target.value));
    e.target.value = '';
  }, [onAddFilter]);

  const addAbility = useCallback((slug) => onAddFilter(createFilter('ability', slug)), [onAddFilter]);
  const addMove = useCallback((slug) => onAddFilter(createFilter('move', slug)), [onAddFilter]);

  return (
    <div id="advanced-filters" className="mt-3 pt-3 border-t border-dashed border-white/20">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <SuggestInput
          id="ability-options"
          label="Filtrar por habilidade"
          placeholder="Habilidade (ex.: Levitate)..."
          loadOptions={fetchAbilityNames}
          onPick={addAbility}
        />
        <SuggestInput
          id="move-options"
          label="Filtrar por golpe que aprende"
          placeholder="Golpe (ex.: Earthquake)..."
          loadOptions={fetchMoveNames}
          onPick={addMove}
        />
        <HeaderSelect label="Filtrar por grupo de ovos" placeholder="Grupo de ovos" onChange={handleEggGroup} className="">
          {eggGroups.map((name) => (
            <option key={name} value={name} className={OPTION_CLASS}>{eggGroupLabel(name)}</option>
          ))}
        </HeaderSelect>
      </div>
      <p className="mt-2 font-hand text-base leading-tight text-[#F7F3EE]/70">
        gerações somam-se (ou); tipos, habilidades, golpes e grupos de ovos têm de se cumprir todos (e).
      </p>
    </div>
  );
}

const FILTER_STATUS_ICON = {
  loading: <Loader2 className="w-3 h-3 animate-spin text-[#78614E]" aria-label="a carregar" />,
  error: <TriangleAlert className="w-3 h-3 text-[#C15454]" aria-label="falhou a carregar; filtro ignorado" />,
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
            title={failed ? 'Não foi possível carregar este filtro; está a ser ignorado.' : undefined}
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
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[#78614E] transition-colors cursor-pointer hover:bg-[#4A3B32]/15 hover:text-[#2A2421] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#829b72]/70"
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
