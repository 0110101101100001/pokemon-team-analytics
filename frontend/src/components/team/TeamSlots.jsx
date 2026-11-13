import { memo } from 'react';
import { X } from 'lucide-react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { TEAM_SIZE } from '../../utils/teamScore';

const SLOTS = Array.from({ length: TEAM_SIZE }, (_, index) => index);

const TeamSlot = memo(function TeamSlot({ pokemon, selected, onSelect, onRemove }) {
  if (!pokemon) {
    return (
      <li className="flex h-28 items-center justify-center rounded-sketch border-2 border-dashed border-[#78614E]/25 font-hand text-lg text-[#78614E]/45">
        vazio
      </li>
    );
  }

  const name = formatSlug(pokemon.name);
  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelect(pokemon.id)}
        aria-pressed={selected}
        aria-label={`Editar ${name}`}
        className={`flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-sketch border bg-[#FFFEFB]/80 px-1 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60 ${
          selected ? 'border-smeargle-olive shadow-ink ring-1 ring-smeargle-olive' : 'border-[#78614E]/25 shadow-card hover:border-[#78614E]/50'
        }`}
      >
        <img src={thumbnailSpriteUrl(pokemon.id)} alt="" width={48} height={48} loading="lazy" decoding="async" className="h-12 w-12 object-contain" />
        <span className="w-full truncate text-center font-serif text-xs font-semibold text-smeargle-text">{name}</span>
        <span className="flex gap-0.5">
          {pokemon.types.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1.5 !text-[8px]" />)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(pokemon.id)}
        aria-label={`Remover ${name}`}
        className="absolute right-1 top-1 cursor-pointer rounded-full p-1 text-[#78614E]/60 transition-colors hover:bg-[#B5543C]/15 hover:text-[#8A3B27] focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </li>
  );
});

function TeamSlots({ team, selectedId, onSelect, onRemove }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {SLOTS.map((index) => (
        <TeamSlot
          key={team[index]?.id ?? `empty-${index}`}
          pokemon={team[index]}
          selected={team[index]?.id === selectedId}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}

export default memo(TeamSlots);
