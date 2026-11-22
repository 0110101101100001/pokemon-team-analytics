import { memo } from 'react';
import { SkipForward } from 'lucide-react';
import { HpTrack } from './BattleScoreboard';
import { actionName, turnReady } from './TurnPanel';

/**
 * Celular: barra presa no rodapé com os PS dos dois lados, os golpes escolhidos para o turno e o botão de passar,
 * para seguir a batalha sem rolar até o painel do turno. Some em telas largas (lg) e enquanto falta um Pokémon.
 * `data-turn-bar` faz o botão de voltar ao topo subir (index.css).
 */
function MobileTurnBar({ fighters, sides, picks, trapped, onPass }) {
  if (fighters.some((fighter) => !fighter)) return null;
  const { ready, replacing, over } = turnReady(sides, picks, trapped);
  const moveName = (index) => {
    return sides[index].bide ? 'Bide' : actionName(sides[index], picks[index]);
  };

  return (
    <div data-turn-bar className="fixed inset-x-0 bottom-0 z-30 border-t-[1.5px] border-ink bg-paper px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-3px_0_rgba(28,26,23,0.12)] lg:hidden">
      <div className="grid grid-cols-2 gap-3">
        {fighters.map((fighter, index) => (
          <div key={index} className="min-w-0">
            <p className="flex items-baseline justify-between gap-1 font-mono text-[11px] tabular-nums text-umber">
              <span className="truncate font-reading text-xs font-semibold text-ink">{fighter.name}</span>
              {fighter.current}/{fighter.max}
            </p>
            <HpTrack current={fighter.current} max={fighter.max} preview={fighter.current ? fighter.preview : null} className="mt-0.5 h-2" />
            <p className="mt-0.5 truncate font-reading text-[11px] italic text-ink-soft">{moveName(index)}</p>
          </div>
        ))}
      </div>
      <button type="button" onClick={onPass} disabled={!ready} className="btn-action mt-1.5 h-9 w-full text-sm">
        <SkipForward className="h-4 w-4" aria-hidden="true" />
        {replacing && !over ? 'Colocar em campo' : 'Passar o turno'}
      </button>
    </div>
  );
}

export default memo(MobileTurnBar);
