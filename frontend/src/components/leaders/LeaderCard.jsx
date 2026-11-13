import { memo } from 'react';
import { Medal } from 'lucide-react';
import PokemonTypeBadge, { TYPE_INK } from '../PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { LEADER_ROLES } from '../../data/gymLeaders';

const NEUTRAL_INK = { bg: '#EDE6DC', border: '#78614E' };

/**
 * Ficha de um líder, membro da Elite 4 ou campeão. `entryByName` resolve o slug de cada Pokémon
 * para a entrada da Pokédex (sprite); tocar num Pokémon abre a ficha dele.
 */
function LeaderCard({ leader, entryByName, onSelectPokemon }) {
  const ink = TYPE_INK[leader.type] ?? NEUTRAL_INK;

  return (
    <li className="paper-card flex flex-col overflow-hidden">
      <header className="relative border-b border-[#5C4033]/25 px-4 pb-3 pt-4" style={{ backgroundColor: `${ink.bg}99` }}>
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: ink.border }} />
        <p className="font-hand text-lg leading-none text-[#78614E]">{LEADER_ROLES[leader.role].caption(leader)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-serif text-xl font-black tracking-tight text-[#2A2421]">{leader.name}</h3>
          {leader.type && <PokemonTypeBadge type={leader.type} />}
        </div>
        {leader.badge && (
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#78614E]">
            <Medal className="h-3.5 w-3.5" aria-hidden="true" />
            {leader.badge}
          </p>
        )}
      </header>

      <ul className="grid flex-1 grid-cols-3 content-start gap-1 p-3">
        {leader.team.map(([slug, level], index) => {
          const entry = entryByName.get(slug);
          return (
            // O mesmo Pokémon pode aparecer duas vezes num time (os dois Onix de Bruno), daí o índice na chave.
            <li key={`${slug}-${index}`}>
              <button
                type="button"
                onClick={() => onSelectPokemon(slug)}
                disabled={!entry}
                className="flex w-full cursor-pointer flex-col items-center rounded-xl px-1 py-1.5 transition-colors hover:bg-[#829b72]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt disabled:cursor-default disabled:hover:bg-transparent"
              >
                {entry && (
                  <img src={thumbnailSpriteUrl(entry.id)} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 object-contain" />
                )}
                <span className="w-full truncate text-center font-serif text-xs font-semibold text-smeargle-text">{formatSlug(slug)}</span>
                <span className="font-mono text-[11px] font-bold tabular-nums text-[#78614E]">Nv. {level}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {leader.note && (
        <p className="border-t border-[#5C4033]/20 px-4 py-2.5 font-serif text-[11px] italic leading-snug text-smeargle-textDim">{leader.note}</p>
      )}
    </li>
  );
}

export default memo(LeaderCard);
