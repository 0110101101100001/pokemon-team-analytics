import { memo } from 'react';
import { Wand2, X } from 'lucide-react';
import { Delta } from './SwapOptionRow';
import { formatSlug } from '../../../utils/filters';

const pct = (value) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/**
 * Proposta de "Corrigir a pior ameaça", mostrada antes de aplicar. Sem correção, mostra o motivo e,
 * quando há, um atalho para a opção que chega mais perto.
 */
function FixProposal({ result, members, onApply, onSeeOptions, onClose }) {
  const close = (
    <button type="button" onClick={onClose} aria-label="Fechar proposta" className="cursor-pointer rounded-full p-1 text-[#78614E] hover:bg-[#78614E]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt">
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );

  if (!result.option) {
    return (
      <div role="status" className="flex items-start gap-2 rounded-xl border border-[#B5543C]/30 bg-[#B5543C]/5 p-2.5 font-serif text-xs text-smeargle-text">
        <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A0442F]" aria-hidden="true" />
        <div className="flex-1 space-y-1.5">
          <p>{result.reason}</p>
          {result.closest && (
            <button type="button" onClick={() => onSeeOptions(result.slotIndex)} className="btn-outline !min-h-8 !px-3 !py-1 !text-xs">
              Ver opções para {formatSlug(members[result.slotIndex].pokemon.name)}
            </button>
          )}
        </div>
        {close}
      </div>
    );
  }

  const { target, option, slotIndex } = result;
  const others = option.fixed.filter((threat) => threat.name !== target.name).slice(0, 3).map((threat) => threat.name);
  return (
    <div role="status" className="flex items-start gap-2 rounded-xl border border-[#829b72]/45 bg-[#829b72]/10 p-2.5 font-serif text-xs text-smeargle-text">
      <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4C6440]" aria-hidden="true" />
      <div className="flex-1 space-y-1.5">
        <p>
          {target.name} ({pct(target.usage)} de uso) está {target.status === 'none' ? 'sem resposta' : 'com resposta fraca'}.
          {' '}Trocar <strong>{formatSlug(members[slotIndex].pokemon.name)} → {formatSlug(option.pokemon.name)}</strong>:{' '}
          <Delta label="Teste do meta" value={option.delta.gauntlet} />, <Delta label="Estilo" value={option.delta.fit} suffix="%" />.
          {others.length > 0 && ` Também resolve ${others.join(', ')}.`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => onApply(result)} className="btn-action !h-8 !px-3.5 font-serif !text-xs">Aplicar</button>
          <button type="button" onClick={() => onSeeOptions(slotIndex)} className="btn-outline !min-h-8 !px-3 !py-1 !text-xs">Ver outras opções</button>
        </div>
      </div>
      {close}
    </div>
  );
}

export default memo(FixProposal);
