import { memo } from 'react';
import PokemonTypeBadge from '../../PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../../../services/api';
import { formatSlug } from '../../../utils/filters';
import { ROLE_LABELS } from '../../../utils/teamRoles';

const MAX_NAMES = 3;

/** "+9" / "−3" / "0", com a cor do sinal: verde-oliva para ganho, terracota para perda. */
export function Delta({ label, value, suffix = '' }) {
  const tone = value > 0 ? 'text-[#4C6440]' : value < 0 ? 'text-[#A0442F]' : 'text-smeargle-textDim';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return (
    <span className={`whitespace-nowrap font-semibold tabular-nums ${tone}`}>
      {label} {sign}{Math.abs(value)}{suffix}
    </span>
  );
}

const names = (threats) => {
  const shown = threats.slice(0, MAX_NAMES).map((threat) => threat.name);
  return threats.length > MAX_NAMES ? `${shown.join(', ')} e mais ${threats.length - MAX_NAMES}` : shown.join(', ');
};

/** Uma troca possível: quem entra, o efeito nas notas, as ameaças que mudam e as funções ganhas ou perdidas. */
function SwapOptionRow({ option, onSwap, actionLabel = 'Trocar' }) {
  const { pokemon, delta, fixed, worsened, rolesGained, rolesLost } = option;
  return (
    <li className="flex items-start gap-2.5 rounded-[4px] border border-[#78614E]/15 bg-paper p-2">
      <img src={thumbnailSpriteUrl(pokemon.id)} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 shrink-0 object-contain" />
      <div className="min-w-0 flex-1 space-y-0.5 text-[11px] leading-snug">
        <p className="flex flex-wrap items-center gap-1">
          <span className="font-reading text-sm font-semibold text-smeargle-text">{formatSlug(pokemon.name)}</span>
          {pokemon.types.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1.5 !text-[8px]" />)}
        </p>
        <p className="flex flex-wrap gap-x-2">
          <Delta label="Teste do meta" value={delta.gauntlet} />
          <Delta label="Estilo" value={delta.fit} suffix="%" />
        </p>
        {fixed.length > 0 && <p className="text-[#4C6440]">Resolve: {names(fixed)}</p>}
        {worsened.length > 0 && <p className="text-[#A0442F]">Piora: {names(worsened)}</p>}
        {(rolesGained.length > 0 || rolesLost.length > 0) && (
          <p className="text-smeargle-textDim">
            {[...rolesGained.map((role) => `+ ${ROLE_LABELS[role]}`), ...rolesLost.map((role) => `− ${ROLE_LABELS[role]}`)].join(' · ')}
          </p>
        )}
      </div>
      <button type="button" onClick={() => onSwap(option)} className="btn-outline !min-h-8 shrink-0 self-center !px-3 !py-1 font-reading !text-xs">
        {actionLabel}
      </button>
    </li>
  );
}

export default memo(SwapOptionRow);
