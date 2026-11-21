import { memo } from 'react';
import PokemonTypeBadge, { TYPE_INK } from '../PokemonTypeBadge';
import TrainerSprite from './TrainerSprite';
import { MIXED_TYPE, roleLabel } from '../../utils/trainers';

const MIXED_INK = '#8A704A';

export const blotColor = (type) =>
  `color-mix(in srgb, ${TYPE_INK[type]?.border ?? MIXED_INK} 30%, #F2EAD9)`;

export function SpecialtyStamp({ type }) {
  if (type !== MIXED_TYPE) return <PokemonTypeBadge type={type} />;
  return <span className="type-stamp text-[#4A463E]">Vários tipos</span>;
}

const generationsLabel = (generations) => {
  const [first, last] = [generations[0], generations.at(-1)];
  return first === last ? `Gen ${first}` : `Gen ${first}–${last}`;
};

/** Card de um treinador na grade: sprite, papéis, especialidade e quantas batalhas ele tem. */
function TrainerCard({ trainer, entryByName, onOpen }) {
  const { battleCount } = trainer;
  return (
    <li className="print-card flex select-none flex-col p-4">
      <button
        type="button"
        onClick={() => onOpen(trainer.slug)}
        aria-label={`Abrir a ficha de ${trainer.name}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-[4px] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EE]"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold tracking-wider text-[#1C1A17] tabular-nums">
          {generationsLabel(trainer.generations)}
        </span>
        <span className="truncate font-reading text-xs italic text-[#4A463E]">{trainer.regions.join(' · ')}</span>
      </div>

      <div className="relative isolate my-2 flex h-[104px] items-center justify-center">
        <span aria-hidden="true" className="print-blot absolute -z-10 h-[88%] aspect-[1.1]" style={{ backgroundColor: blotColor(trainer.type) }} />
        <TrainerSprite trainer={trainer} entryByName={entryByName} />
      </div>

      <h3 className="break-words text-center font-serif text-lg font-bold leading-snug text-[#1C1A17] sm:text-xl">{trainer.name}</h3>
      <p className="mt-0.5 text-center font-reading text-sm text-[#4A463E]">{trainer.roles.map(roleLabel).join(' · ')}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <SpecialtyStamp type={trainer.type} />
        <span className="font-mono text-[11px] font-bold tabular-nums text-[#4A463E]">
          {battleCount} batalha{battleCount !== 1 ? 's' : ''}
        </span>
      </div>
    </li>
  );
}

export default memo(TrainerCard);
