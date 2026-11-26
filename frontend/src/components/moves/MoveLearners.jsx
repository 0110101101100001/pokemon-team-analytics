import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, TriangleAlert } from 'lucide-react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import ShowMoreButton from '../ShowMoreButton';
import { useIncrementalList } from '../../hooks/useIncrementalList';
import { fetchMoveLearners, thumbnailSpriteUrl } from '../../services/api';
import { fetchLearnMethods } from '../../services/moveLearnMethods';
import { GAMES } from '../../data/games';
import { DEX_SIZE } from '../../utils/pokedex';
import { formatSlug } from '../../utils/filters';
import { LEARN_METHODS, learnBadges, learnsBy } from '../../utils/learnMethods';

// Pokémon montados por lote dentro da lista com rolagem (Protect tem mais de mil).
const BATCH_SIZE = 48;

const formatDexNumber = (number) => (number ? `#${String(number).padStart(4, '0')}` : '');

const GAME_LABEL = new Map(GAMES.map((game) => [game.id, game.label]));
const gameLabel = (slug) => GAME_LABEL.get(slug) ?? formatSlug(slug);

// Uma cor por método, todas tokens de texto do tema (contraste ≥4,5 medido em themes.test.js).
const METHOD_COLOR = {
  level: 'text-olive-ink',
  machine: 'text-ink',
  egg: 'text-ochre-deep',
  tutor: 'text-paint-magenta',
  other: 'text-sepia',
};
const STAMP = 'type-stamp !px-1 !py-0.5 !text-[9px] font-bold';

// Textos da lista; a aba Habilidades troca "aprende" por "tem".
export const LEARNER_COPY = {
  loading: 'Procurando quem aprende...',
  count: (total) => (total === 1 ? 'Pokémon aprende' : 'Pokémon aprendem'),
  empty: 'Nenhum Pokémon aprende este golpe.',
};

// Formas que não estão na grade (Megas, Gigantamax) ficam sem número e vão para o fim, na ordem da PokéAPI.
// `methods` (só na aba Golpes): como cada Pokémon aprende, por id; cada forma tem os próprios métodos.
function toLearners(list, entryByName, methods) {
  return list
    .map(({ name, id, hidden = false }) => {
      const entry = entryByName.get(name);
      const number = entry?.number ?? (id <= DEX_SIZE ? id : null);
      const method = methods?.[id];
      return {
        name, id, number, hidden, method, badges: learnBadges(method, gameLabel), types: entry?.types ?? [], label: formatSlug(name),
      };
    })
    .sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.id - b.id);
}

// `load(move)` resolve [{ name, id, hidden? }]: por padrão, todos os que aprendem o golpe em algum jogo.
// Com `withMethods`, o índice do golpe (public/data/move-learners) é baixado junto, só agora que a lista abriu.
function useMoveLearners(move, load, entryByName, withMethods) {
  const [state, setState] = useState({ move: null, load: null, status: 'loading', list: [], methods: null });

  useEffect(() => {
    let active = true;
    // Sem o índice, a lista sai mesmo assim, só sem as etiquetas.
    const methods = withMethods ? fetchLearnMethods(move).catch(() => null) : Promise.resolve(null);
    Promise.all([load(move), methods])
      .then(([list, byId]) => active && setState({ move, load, status: 'ready', list, methods: byId }))
      .catch(() => active && setState({ move, load, status: 'error', list: [], methods: null }));
    return () => { active = false; };
  }, [move, load, withMethods]);

  const learners = useMemo(
    () => toLearners(state.list, entryByName, state.methods),
    [state.list, entryByName, state.methods],
  );
  const current = state.move === move && state.load === load;
  return current
    ? { status: state.status, learners, hasMethods: Boolean(state.methods) }
    : { status: 'loading', learners: [], hasMethods: false };
}

const LearnerButton = memo(function LearnerButton({ learner, onSelect }) {
  const { name, id, number, hidden, types, label, badges } = learner;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(name)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-[3px] border border-ink/20 bg-paper px-2 py-1 text-left transition-colors hover:border-ink/60 hover:bg-paper-2/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
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
          <span className="block truncate font-serif text-sm font-bold leading-tight text-ink">{label}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {number && <span className="font-mono text-[10px] tracking-wide text-umber">{formatDexNumber(number)}</span>}
            {types.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1 !py-0.5 !text-[9px]" />)}
            {hidden && <span className={`${STAMP} text-vermilion`}>oculta</span>}
          </span>
        </span>
        {/* Coluna à direita, até três etiquetas por coluna: cabem na altura do sprite e o card não cresce. */}
        {badges.length > 0 && (
          <span className="grid shrink-0 grid-flow-col grid-rows-[repeat(3,auto)] content-center justify-items-end gap-px">
            {badges.map((badge) => (
              <span key={badge.kind} title={badge.title} aria-label={badge.ariaLabel} className={`${STAMP} ${METHOD_COLOR[badge.kind]}`}>
                {badge.text}
              </span>
            ))}
          </span>
        )}
      </button>
    </li>
  );
});

const METHOD_OPTIONS = [{ value: 'all', label: 'Todos' }, ...LEARN_METHODS];

/** "Todos | Nível | TM | Ovo | Tutor": filtra a lista pelo jeito de aprender. */
function MethodFilter({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Filtrar por jeito de aprender" className="flex flex-wrap gap-1 sm:ml-auto">
      {METHOD_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`h-8 cursor-pointer rounded-[2px] border-[1.5px] px-2.5 font-reading text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
              selected ? 'border-vermilion font-semibold text-vermilion' : 'border-ink/40 text-ink hover:border-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Quem aprende o golpe: uma busca por nome ou número e a lista; o clique abre a ficha do Pokémon.
 * `context` completa a contagem ("por TM em Scarlet / Violet").
 */
function MoveLearners({
  id, move, load = fetchMoveLearners, context = '', copy = LEARNER_COPY, withMethods = false, entryByName, onSelectPokemon,
}) {
  const { status, learners, hasMethods } = useMoveLearners(move, load, entryByName, withMethods);
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('all');
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase().replace(/^#0*/, '');
    return learners.filter((l) =>
      (!hasMethods || learnsBy(l.method, method))
      && (!term || l.label.toLowerCase().includes(term) || String(l.number ?? '') === term));
  }, [learners, deferredQuery, hasMethods, method]);

  const scrollRef = useRef(null);
  const batch = useIncrementalList(visible, BATCH_SIZE, scrollRef);

  if (status === 'loading') {
    return (
      <p id={id} className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-umber">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {copy.loading}
      </p>
    );
  }

  if (status === 'error') {
    return (
      <p id={id} role="alert" className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-vermilion-deep">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        Não foi possível carregar a lista agora. Tente de novo em instantes.
      </p>
    );
  }

  return (
    <div id={id} className="space-y-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="font-reading text-sm text-brown">
          <span className="font-semibold tabular-nums text-ink">{learners.length}</span>{' '}
          {copy.count(learners.length)} {formatSlug(move)}{context && ` ${context}`}
        </p>
        {hasMethods && <MethodFilter value={method} onChange={setMethod} />}
        <label className="relative block sm:w-72">
          <span className="sr-only">Pesquisar na lista de {formatSlug(move)}</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-umber" aria-hidden="true" />
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
