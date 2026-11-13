import { memo, useDeferredValue, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../../services/api';
import { createSearchMatcher, formatSlug } from '../../utils/filters';

const RESULT_LIMIT = 6;

const speciesOf = (pokemon) => pokemon.species ?? pokemon.name;

/**
 * Busca de Pokémon por nome ou número, com a lista de resultados logo abaixo do campo.
 * `excludedSpecies` (Set) tira da lista espécies que não podem ser escolhidas, como as que já estão no time.
 */
function PokemonPicker({ pool, onPick, label, placeholder, excludedSpecies, disabled = false }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const matches = createSearchMatcher(deferredQuery);
    if (!matches) return [];
    const found = [];
    for (const pokemon of pool) {
      if (!matches(pokemon) || excludedSpecies?.has(speciesOf(pokemon))) continue;
      found.push(pokemon);
      if (found.length === RESULT_LIMIT) break;
    }
    return found;
  }, [deferredQuery, pool, excludedSpecies]);

  const pick = (pokemon) => {
    onPick(pokemon);
    setQuery('');
  };

  const searching = deferredQuery.trim().length > 0;

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78614E]/70" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="paper-field h-11 pl-10"
        />
      </label>

      {searching && (
        results.length ? (
          <ul className="mt-2 space-y-1.5">
            {results.map((pokemon) => (
              <li key={pokemon.id}>
                <button
                  type="button"
                  onClick={() => pick(pokemon)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#78614E]/15 bg-[#FFFEFB]/70 px-3 py-1.5 text-left transition-colors hover:border-smeargle-olive hover:bg-smeargle-olive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
                >
                  <img src={thumbnailSpriteUrl(pokemon.id)} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 shrink-0 object-contain" />
                  <span className="min-w-0 flex-1 truncate font-serif text-sm font-semibold text-smeargle-text">{formatSlug(pokemon.name)}</span>
                  <span className="flex shrink-0 gap-0.5">
                    {pokemon.types.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1.5 !text-[8px]" />)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center font-serif text-sm italic text-smeargle-textDim/70">Nenhum Pokémon encontrado.</p>
        )
      )}
    </div>
  );
}

export default memo(PokemonPicker);
