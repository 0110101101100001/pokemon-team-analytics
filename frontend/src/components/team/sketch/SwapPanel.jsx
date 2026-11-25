import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import PokemonPicker from '../../battle/PokemonPicker';
import SwapOptionRow from './SwapOptionRow';
import { formatSlug } from '../../../utils/filters';
import { evaluateManualSwap, swapOptions } from '../../../utils/sketchEdit';
import { speciesOf } from '../../../utils/teamScore';

/**
 * Painel de troca de um membro: as 5 melhores trocas com o efeito nas notas e, no fim, qualquer Pokémon do tier.
 * Desktop: popover ancorado abaixo dos sprites, com a seta no sprite. Celular (< 640 px): folha que sobe de baixo.
 * Fecha com Esc, clique fora ou botão; quem abriu devolve o foco ao sprite em `onClose`.
 */
function SwapPanel({ members, slotIndex, ctx, before, onSwap, onClose }) {
  const panelRef = useRef(null);
  const [manual, setManual] = useState(null);
  const name = formatSlug(members[slotIndex].pokemon.name);
  const options = useMemo(() => swapOptions(members, slotIndex, ctx, { before }), [members, slotIndex, ctx, before]);
  const taken = useMemo(() => new Set(members.map((member) => speciesOf(member.pokemon))), [members]);

  useEffect(() => {
    panelRef.current?.querySelector('[data-autofocus]')?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    const onPointer = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target) && !event.target.closest?.('[data-sketch-slot]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  const pickManual = (entry) => setManual({ entry, result: evaluateManualSwap(members, slotIndex, entry, ctx) });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-scrim/60 sm:hidden" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label={`Trocar ${name}`}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-sketch border border-ink/25 bg-paper shadow-[0_-12px_32px_-12px_color-mix(in_srgb,var(--shadow-base)_45%,transparent)] sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:z-30 sm:mt-2 sm:max-h-[28rem] sm:rounded-sketch sm:shadow-hard"
      >
        {/* Seta do popover apontando para o sprite (só no desktop). */}
        <span
          aria-hidden="true"
          className="absolute -top-1.5 hidden h-3 w-3 rotate-45 border-l border-t border-ink/25 bg-paper sm:block"
          style={{ left: `calc(${((slotIndex + 0.5) / members.length) * 100}% - 6px)` }}
        />
        {/* A rolagem fica aqui dentro, para não cortar a seta do popover. */}
        <div className="min-h-0 overflow-y-auto overflow-x-hidden p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="font-serif text-base font-bold text-smeargle-text">Trocar {name}</h4>
            <button type="button" data-autofocus onClick={onClose} aria-label="Fechar" className="cursor-pointer rounded-full p-1.5 text-umber hover:bg-umber/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {options.length ? (
            <ul className="space-y-1.5">
              {options.map((option) => <SwapOptionRow key={option.pokemon.id} option={option} onSwap={onSwap} />)}
            </ul>
          ) : (
            <p className="font-reading text-xs italic text-smeargle-textDim">Nenhum Pokémon do tier cabe neste slot com as regras do plano.</p>
          )}

          <div className="mt-3 border-t border-umber/15 pt-2.5">
            <p className="paper-label">Escolher outro Pokémon…</p>
            <PokemonPicker pool={ctx.tierPool} onPick={pickManual} excludedSpecies={taken} label={`Escolher quem entra no lugar de ${name}`} placeholder="Buscar no tier..." />
            {manual && (
              'error' in manual.result ? (
                <p role="alert" className="mt-2 text-xs font-semibold text-vermilion-deep">
                  {formatSlug(manual.entry.name)} não pode entrar: {manual.result.error}.
                </p>
              ) : (
                <ul className="mt-2">
                  <SwapOptionRow option={manual.result} onSwap={onSwap} actionLabel="Confirmar" />
                </ul>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(SwapPanel);
