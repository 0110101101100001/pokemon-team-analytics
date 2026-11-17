import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, TriangleAlert } from 'lucide-react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import ShowMoreButton from '../ShowMoreButton';
import { useIncrementalList } from '../../hooks/useIncrementalList';
import { fetchMoveLearners, thumbnailSpriteUrl } from '../../services/api';
import { DEX_SIZE } from '../../utils/pokedex';
import { formatSlug } from '../../utils/filters';

// Pokémon montados por lote dentro da lista com rolagem (Protect tem mais de mil).
const BATCH_SIZE = 48;

const formatDexNumber = (number) => (number ? `#${String(number).padStart(4, '0')}` : '');

// Textos da lista; a aba Habilidades troca "aprende" por "tem".
export const LEARNER_COPY = {
  loading: 'Procurando quem aprende...',
  count: (total) => (total === 1 ? 'Pokémon aprende' : 'Pokémon aprendem'),
  empty: 'Nenhum Pokémon aprende este golpe.',
};

// Formas que não estão na grade (Megas, Gigantamax) ficam sem número e vão para o fim, na ordem da PokéAPI.
function toLearners(list, entryByName) {
  return list
    .map(({ name, id, hidden = false }) => {
      const entry = entryByName.get(name);
      const number = entry?.number ?? (id <= DEX_SIZE ? id : null);
      return { name, id, number, hidden, types: entry?.types ?? [], label: formatSlug(name) };
    })
    .sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.id - b.id);
}

// `load(move)` resolve [{ name, id, hidden? }]: por padrão, todos os que aprendem o golpe em algum jogo.
function useMoveLearners(move, load, entryByName) {
  const [state, setState] = useState({ move: null, load: null, status: 'loading', list: [] });

  useEffect(() => {
    let active = true;
    load(move)
      .then((list) => active && setState({ move, load, status: 'ready', list }))
      .catch(() => active && setState({ move, load, status: 'error', list: [] }));
    return () => { active = false; };
  }, [move, load]);

  const learners = useMemo(() => toLearners(state.list, entryByName), [state.list, entryByName]);
  const current = state.move === move && state.load === load;
  return current ? { status: state.status, learners } : { status: 'loading', learners: [] };
}

const LearnerButton = memo(function LearnerButton({ learner, onSelect }) {
  const { name, id, number, hidden, types, label } = learner;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(name)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-[3px] border border-[#2A2421]/20 bg-paper px-2 py-1 text-left transition-colors hover:border-[#2A2421]/60 hover:bg-[#E6D9BE]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
      >
        <img
          src={thumbnailSpriteUrl(id)}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
          className="h-12 w-12 shrink-0 object-contain [image-rendering:pixelated]"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-sm font-bold leading-tight text-[#2A2421]">{label}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {number && <span className="font-mono text-[10px] tracking-wide text-[#78614E]">{formatDexNumber(number)}</span>}
            {types.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1 !py-0.5 !text-[9px]" />)}
            {hidden && <span className="type-stamp !px-1 !py-0.5 !text-[9px] font-bold text-[#B8402A]">oculta</span>}
          </span>
        </span>
      </button>
    </li>
  );
});

/**
 * Quem aprende o golpe: uma busca por nome ou número e a lista; o clique abre a ficha do Pokémon.
 * `context` completa a contagem ("por TM em Scarlet / Violet").
 */
function MoveLearners({ id, move, load = fetchMoveLearners, context = '', copy = LEARNER_COPY, entryByName, onSelectPokemon }) {
  const { status, learners } = useMoveLearners(move, load, entryByName);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase().replace(/^#0*/, '');
    if (!term) return learners;
    return learners.filter((l) => l.label.toLowerCase().includes(term) || String(l.number ?? '') === term);
  }, [learners, deferredQuery]);

  const scrollRef = useRef(null);
  const batch = useIncrementalList(visible, BATCH_SIZE, scrollRef);

  if (status === 'loading') {
    return (
      <p id={id} className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-[#78614E]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {copy.loading}
      </p>
    );
  }

  if (status === 'error') {
    return (
      <p id={id} role="alert" className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-[#8A3B27]">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        Não foi possível carregar a lista agora. Tente de novo em instantes.
      </p>
    );
  }

  return (
    <div id={id} className="space-y-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-reading text-sm text-[#785132]">
          <span className="font-semibold tabular-nums text-[#2A2421]">{learners.length}</span>{' '}
          {copy.count(learners.length)} {formatSlug(move)}{context && ` ${context}`}
        </p>
        <label className="relative block sm:w-72">
          <span className="sr-only">Pesquisar na lista de {formatSlug(move)}</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78614E]" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou número..."
            className="paper-field h-9 pl-8 text-sm"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="py-4 text-center font-reading text-sm italic text-smeargle-textDim/80">
          {learners.length === 0 ? copy.empty : 'Nenhum Pokémon encontrado.'}
        </p>
      ) : (
        <div ref={scrollRef} className="max-h-[22rem] overflow-y-auto pr-1">
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {batch.visible.map((learner) => (
              <LearnerButton key={learner.name} learner={learner} onSelect={onSelectPokemon} />
            ))}
          </ul>
          <ShowMoreButton list={batch} className="mt-3" />
        </div>
      )}
    </div>
  );
}

export default memo(MoveLearners);
