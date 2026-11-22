import { memo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import PokemonPicker from '../battle/PokemonPicker';
import { MAX_RESERVES } from './calcState';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';

const STATUS_SHORT = { burn: 'BRN', poison: 'PSN', toxic: 'TOX', paralysis: 'PAR', sleep: 'SLP', freeze: 'FRZ' };

function memberState({ currentHp, status }) {
  if (currentHp === 0) return 'caiu';
  return [currentHp == null ? 'cheio' : `${currentHp} PS`, STATUS_SHORT[status]].filter(Boolean).join(' · ');
}

/**
 * Reservas do lado: tocar numa põe o Pokémon em campo antes da batalha começar e, com ela em andamento,
 * escolhe a troca para o próximo turno. `planned` é o uid da troca já escolhida.
 */
function PartyStrip({ bench, pool, planned, inBattle, onBring, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const room = bench.length < MAX_RESERVES;

  const add = (pokemon) => {
    onAdd(pokemon);
    setAdding(false);
  };

  return (
    <div className="rounded-[4px] border border-sepia/30 bg-page/50 px-2.5 py-2" role="group" aria-label="Reservas">
      <div className="flex items-baseline gap-2">
        <span className="font-hand text-lg leading-none text-sepia">reservas</span>
        {bench.length > 0 && (
          <span className="font-reading text-[11px] italic text-umber">
            {inBattle ? 'toque para trocar no próximo turno' : 'toque para pôr em campo'}
          </span>
        )}
        {room && (
          <button
            type="button"
            aria-expanded={adding}
            onClick={() => setAdding((open) => !open)}
            className="ml-auto inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-[3px] px-1.5 py-0.5 font-hand text-base leading-none text-umber transition-colors hover:bg-umber/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            reserva
          </button>
        )}
      </div>

      {bench.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {bench.map((member) => {
            const name = formatSlug(member.form || member.pokemon.name);
            const down = member.currentHp === 0;
            return (
              <li key={member.uid} className="relative">
                <button
                  type="button"
                  onClick={() => onBring(member.uid)}
                  disabled={down}
                  aria-pressed={planned === member.uid}
                  aria-label={`${inBattle ? 'Trocar para' : 'Pôr em campo'} ${name}`}
                  title={name}
                  className={`flex min-w-[3.75rem] cursor-pointer flex-col items-center rounded-[3px] border bg-paper px-1 pb-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt disabled:cursor-not-allowed ${
                    planned === member.uid ? 'border-vermilion ring-1 ring-vermilion' : 'border-umber/25 hover:border-umber/60'
                  }`}
                >
                  <img
                    src={thumbnailSpriteUrl(member.pokemon.id)}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className={`h-10 w-10 object-contain ${down ? 'opacity-50 [filter:grayscale(1)_sepia(0.7)]' : ''}`}
                  />
                  <span className={`font-mono text-[10px] font-bold tabular-nums ${down ? 'text-vermilion-deep' : 'text-umber'}`}>{memberState(member)}</span>
                </button>
                {!inBattle && (
                  <button
                    type="button"
                    onClick={() => onRemove(member.uid)}
                    aria-label={`Tirar ${name} das reservas`}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-[3px] border border-umber/40 bg-paper text-umber hover:text-vermilion-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding && room && (
        <div className="mt-2">
          <PokemonPicker pool={pool} onPick={add} label="Adicionar reserva" placeholder="Nome ou número da reserva..." />
        </div>
      )}
    </div>
  );
}

export default memo(PartyStrip);
