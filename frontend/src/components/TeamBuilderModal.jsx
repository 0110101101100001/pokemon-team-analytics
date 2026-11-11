import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { BookOpen, Plus, Search, ShieldHalf, Sparkles, X } from 'lucide-react';
import PokemonTypeBadge from './PokemonTypeBadge';
import TeamManagerModal from './TeamManagerModal';
import TeamTypeTable from './TeamTypeTable';
import { thumbnailSpriteUrl } from '../services/api';
import { createSearchMatcher, formatSlug } from '../utils/filters';
import { capitalize } from '../utils/typeColors';
import { TEAM_SIZE } from '../utils/teamScore';
import { useTeamBuilderScore } from '../hooks/useTeamBuilderScore';

const SEARCH_LIMIT = 8;
const SUGGESTION_LIMIT = 8;
const SLOTS = Array.from({ length: TEAM_SIZE }, (_, index) => index);
const VIEWS = [
  { key: 'suggestions', label: 'sugestões', icon: Sparkles },
  { key: 'analysis', label: 'fraquezas e cobertura', icon: ShieldHalf },
];

const speciesOf = (pokemon) => pokemon.species ?? pokemon.name;
const listTypes = (types) => types.map(capitalize).join(', ');

function describeReasons({ patched, newCoverage, countered, usage, partners = [], answers = [], core }) {
  const parts = [];
  if (usage != null) parts.push(`${usage.toFixed(1)}% de uso`);
  if (partners.length) parts.push(`par de ${partners.join(', ')}`);
  if (core) parts.push(`mesmo núcleo de ${core}`);
  if (answers.length) parts.push(`segura ${answers.join(', ')}`);
  if (patched.length) parts.push(`cobre ${listTypes(patched)}`);
  if (newCoverage.length) parts.push(`bate em ${listTypes(newCoverage)}`);
  if (countered.length) parts.push(`responde a ${listTypes(countered)}`);
  return parts.join(' · ');
}

const Sprite = ({ pokemon, className }) => (
  <img src={thumbnailSpriteUrl(pokemon.id)} alt="" loading="lazy" className={`object-contain ${className}`} />
);

const TeamSlot = memo(function TeamSlot({ pokemon, onRemove }) {
  if (!pokemon) {
    return (
      <li className="flex h-28 items-center justify-center rounded-sketch border-2 border-dashed border-[#78614E]/25 font-hand text-lg text-[#78614E]/45">
        vazio
      </li>
    );
  }

  return (
    <li className="group relative flex h-28 flex-col items-center justify-center gap-1 rounded-sketch border border-[#78614E]/25 bg-[#FFFEFB]/80 px-1 shadow-card">
      <button
        type="button"
        onClick={() => onRemove(pokemon.id)}
        aria-label={`Remover ${formatSlug(pokemon.name)}`}
        className="absolute right-1 top-1 rounded-full p-1 text-[#78614E]/60 transition-colors hover:bg-[#B5543C]/15 hover:text-[#8A3B27] focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <Sprite pokemon={pokemon} className="h-12 w-12" />
      <p className="w-full truncate text-center font-serif text-xs font-semibold text-smeargle-text">{formatSlug(pokemon.name)}</p>
      <div className="flex gap-0.5">
        {pokemon.types.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1.5 !text-[8px]" />)}
      </div>
    </li>
  );
});

const CandidateRow = memo(function CandidateRow({ pokemon, score, detail, onAdd }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onAdd(pokemon)}
        className="flex w-full items-center gap-3 rounded-xl border border-[#78614E]/15 bg-[#FFFEFB]/70 px-3 py-2 text-left transition-colors hover:border-smeargle-olive hover:bg-smeargle-olive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
      >
        <Sprite pokemon={pokemon} className="h-10 w-10 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-serif text-sm font-semibold text-smeargle-text">{formatSlug(pokemon.name)}</span>
            {pokemon.types.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1.5 !text-[8px]" />)}
          </span>
          {detail && <span className="mt-0.5 block truncate font-serif text-[11px] italic text-smeargle-textDim/80">{detail}</span>}
        </span>
        {score != null && (
          <span className="shrink-0 rounded-pill bg-[#78614E] px-2 py-0.5 font-mono text-sm tabular-nums text-[#FFFEFB]">{score}</span>
        )}
        <Plus className="h-4 w-4 shrink-0 text-[#78614E]/60" aria-hidden="true" />
      </button>
    </li>
  );
});

export default function TeamBuilderModal({ onClose, team, onTeamChange, pool, session }) {
  const [query, setQuery] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const [view, setView] = useState('suggestions');
  const deferredQuery = useDeferredValue(query);
  const ids = useId();

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (managerOpen) return undefined;
    const handleKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [managerOpen]);

  const isFull = team.length >= TEAM_SIZE;
  const suggestions = useTeamBuilderScore(team, pool, { limit: SUGGESTION_LIMIT });

  const searchResults = useMemo(() => {
    const matches = createSearchMatcher(deferredQuery);
    if (!matches) return [];
    const taken = new Set(team.map(speciesOf));
    const results = [];
    for (const pokemon of pool) {
      if (!matches(pokemon) || taken.has(speciesOf(pokemon))) continue;
      results.push(pokemon);
      if (results.length === SEARCH_LIMIT) break;
    }
    return results;
  }, [deferredQuery, pool, team]);

  const addPokemon = useCallback((pokemon) => {
    onTeamChange((current) =>
      current.length >= TEAM_SIZE || current.some((member) => speciesOf(member) === speciesOf(pokemon))
        ? current
        : [...current, pokemon]);
    setQuery('');
  }, [onTeamChange]);

  const removePokemon = useCallback((id) => {
    onTeamChange((current) => current.filter((member) => member.id !== id));
  }, [onTeamChange]);

  const loadTeam = useCallback((stored) => {
    const byId = new Map(pool.map((pokemon) => [pokemon.id, pokemon]));
    onTeamChange(stored.map((pokemon) => byId.get(pokemon.id) ?? pokemon).slice(0, TEAM_SIZE));
  }, [pool, onTeamChange]);

  const openManager = useCallback(() => setManagerOpen(true), []);
  const closeManager = useCallback(() => setManagerOpen(false), []);

  const showingSearch = deferredQuery.trim().length > 0;
  // Com o time completo não há sugestões: a análise passa a ser a vista principal.
  const activeView = isFull ? 'analysis' : view;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2421]/40 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-panel border border-[#78614E]/30 bg-[#FFFEFB]/90 p-6 shadow-panel backdrop-blur-xl animate-bubble-pop sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#78614E]/70 transition-colors hover:bg-[#78614E]/10 hover:text-[#78614E] focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="mb-5 flex flex-wrap items-end justify-between gap-3 pr-8">
          <div>
            <p className="font-hand text-xl leading-none text-[#78614E] -rotate-1">esboço de equipe</p>
            <h2 id={`${ids}-title`} className="mt-1 font-display text-2xl font-bold text-[#78614E]">
              Team Builder
              <span className="ml-2 font-sans text-xs font-semibold text-smeargle-textDim/70">{team.length}/{TEAM_SIZE}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={openManager}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#78614E]/30 bg-[#78614E]/5 px-4 text-xs font-semibold tracking-wide text-[#78614E] transition-colors hover:bg-[#78614E]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Salvar / Meus times
          </button>
        </header>

        <ul className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SLOTS.map((index) => (
            <TeamSlot key={team[index]?.id ?? `empty-${index}`} pokemon={team[index]} onRemove={removePokemon} />
          ))}
        </ul>

        <label htmlFor={`${ids}-search`} className="relative mb-4 block">
          <span className="sr-only">Adicionar Pokémon</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78614E]/70" aria-hidden="true" />
          <input
            id={`${ids}-search`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isFull}
            placeholder={isFull ? 'Time completo — remova um Pokémon para trocar' : 'Adicionar por nome ou número...'}
            className="h-11 w-full rounded-xl border border-[#78614E]/25 bg-[#FFFEFB]/70 pl-10 pr-3 font-serif text-sm text-smeargle-text shadow-inner transition-colors placeholder:italic placeholder:text-[#78614E]/55 hover:border-[#78614E]/45 focus:border-smeargle-olive focus:outline-none focus:ring-2 focus:ring-smeargle-olive/60 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <section className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
          {showingSearch ? (
            searchResults.length ? (
              <ul className="space-y-1.5">
                {searchResults.map((pokemon) => <CandidateRow key={pokemon.id} pokemon={pokemon} onAdd={addPokemon} />)}
              </ul>
            ) : (
              <p className="py-6 text-center font-serif text-sm italic text-smeargle-textDim/70">Nenhum Pokémon encontrado.</p>
            )
          ) : team.length === 0 ? (
            <p className="py-6 text-center font-serif text-sm italic text-smeargle-textDim/70">
              Adicione o primeiro Pokémon para receber sugestões de cobertura e sinergia.
            </p>
          ) : (
            <>
              <div role="tablist" className="mb-3 flex gap-1 border-b border-dashed border-[#78614E]/25">
                {VIEWS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={activeView === key}
                    onClick={() => setView(key)}
                    className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 pb-1.5 font-hand text-xl leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60 ${
                      activeView === key ? 'border-[#78614E] text-[#78614E]' : 'border-transparent text-[#78614E]/55 hover:text-[#78614E]'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>

              {activeView === 'analysis' ? (
                <TeamTypeTable team={team} />
              ) : isFull ? (
                <p className="py-6 text-center font-serif text-sm italic text-smeargle-textDim/70">Time completo. Hora de salvar!</p>
              ) : (
                <ul className="space-y-1.5">
                  {suggestions.map(({ pokemon, score, reasons }) => (
                    <CandidateRow key={pokemon.id} pokemon={pokemon} score={score} detail={describeReasons(reasons)} onAdd={addPokemon} />
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      <TeamManagerModal open={managerOpen} onClose={closeManager} session={session} team={team} onLoadTeam={loadTeam} />
    </div>
  );
}
