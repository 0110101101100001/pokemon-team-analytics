import { memo } from 'react';
import { Plus } from 'lucide-react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { capitalize } from '../../utils/typeColors';
import { useTeamBuilderScore } from '../../hooks/useTeamBuilderScore';

const SUGGESTION_LIMIT = 8;

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

const SuggestionRow = memo(function SuggestionRow({ pokemon, score, detail, onAdd }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onAdd(pokemon)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#78614E]/15 bg-[#FFFEFB]/70 px-3 py-2 text-left transition-colors hover:border-smeargle-olive hover:bg-smeargle-olive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
      >
        <img src={thumbnailSpriteUrl(pokemon.id)} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 shrink-0 object-contain" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-serif text-sm font-semibold text-smeargle-text">{formatSlug(pokemon.name)}</span>
            {pokemon.types.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1.5 !text-[8px]" />)}
          </span>
          {detail && <span className="mt-0.5 block truncate font-serif text-[11px] italic text-smeargle-textDim/80">{detail}</span>}
        </span>
        <span className="shrink-0 rounded-pill bg-[#78614E] px-2 py-0.5 font-mono text-sm tabular-nums text-[#FFFEFB]">{score}</span>
        <Plus className="h-4 w-4 shrink-0 text-[#78614E]/60" aria-hidden="true" />
      </button>
    </li>
  );
});

/** Sugestões pontuadas para completar o time. Só é montado com a aba aberta: é aí que os dados da Smogon são buscados. */
function TeamSuggestions({ team, pool, onAdd }) {
  const suggestions = useTeamBuilderScore(team, pool, { limit: SUGGESTION_LIMIT });

  return (
    <ul className="space-y-1.5">
      {suggestions.map(({ pokemon, score, reasons }) => (
        <SuggestionRow key={pokemon.id} pokemon={pokemon} score={score} detail={describeReasons(reasons)} onAdd={onAdd} />
      ))}
    </ul>
  );
}

export default memo(TeamSuggestions);
