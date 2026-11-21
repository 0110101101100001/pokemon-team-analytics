import { memo } from 'react';
import PokemonTypeBadge from './PokemonTypeBadge';
import { capitalize } from '../utils/typeColors';

const LABEL = 'block text-[10px] font-semibold uppercase text-[#78614E]';

/** O golpe exclusivo da forma Gigantamax: tipo, quando entra em jogo, poder e efeito. */
function GmaxMoveCard({ move, formLabel }) {
  return (
    <article className="space-y-3 rounded-[4px] border border-[#2A2421]/12 bg-paper p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="font-serif text-lg font-black tracking-tight text-[#2A2421]">{move.name}</h4>
        <PokemonTypeBadge type={move.type} />
        <span className="type-stamp font-bold text-[#B8402A]">Exclusivo</span>
      </header>

      <p className="font-reading text-[15px] text-[#2A2421]">{move.effect}</p>

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-[4px] border border-[#2A2421]/10 bg-paper/80 p-2.5">
          <dt className={LABEL}>Quando entra</dt>
          <dd className="text-xs font-bold text-[#2A2421]">
            {formLabel} usa um golpe de dano do tipo {capitalize(move.type)}: ele vira {move.name} no lugar do golpe Max.
          </dd>
        </div>
        <div className="rounded-[4px] border border-[#2A2421]/10 bg-paper/80 p-2.5">
          <dt className={LABEL}>Poder</dt>
          <dd className="text-xs font-bold text-[#2A2421]">
            {move.power ? `${move.power}, fixo` : 'O mesmo do golpe Max: depende do poder do golpe base'}
          </dd>
        </div>
      </dl>

      <p className="text-[11px] italic text-[#4A463E]">
        Só em Sword e Shield, durante os 3 turnos de Dynamax. A categoria (física ou especial) é a do golpe base.
      </p>
    </article>
  );
}

export default memo(GmaxMoveCard);
