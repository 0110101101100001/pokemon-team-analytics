import { memo } from 'react';
import { RotateCcw } from 'lucide-react';
import { HpTrack } from './BattleScoreboard';

/**
 * PS do lado na batalha: a barra em pincelada encolhe a cada turno; o número pode ser editado à mão
 * (0 a PS máximos) e "cheio" devolve os PS máximos.
 */
function HpBar({ current, max, preview, onChange }) {
  const fraction = max ? current / max : 0;
  const percent = (fraction * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const full = current === max;

  return (
    <div className="rounded-[4px] border border-sepia/30 bg-page/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="font-hand text-lg leading-none text-sepia">PS</span>
        <label className="flex items-center gap-1 font-mono text-[13px] tabular-nums text-ink">
          <span className="sr-only">PS atuais</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={max}
            value={current}
            onChange={(e) => onChange(Math.min(max, Math.max(0, Math.round(Number(e.target.value) || 0))))}
            className="paper-field h-8 w-[4.5rem] px-1.5 text-right font-mono text-[13px] tabular-nums"
          />
          <span className="text-umber">/ {max}</span>
        </label>
        <span className="ml-auto font-mono text-xs font-bold tabular-nums text-umber">{percent}%</span>
        <button
          type="button"
          onClick={() => onChange(max)}
          disabled={full}
          title="Voltar aos PS cheios"
          className="inline-flex cursor-pointer items-center gap-1 rounded-[3px] px-1.5 py-0.5 font-hand text-base leading-none text-umber transition-colors hover:bg-umber/10 disabled:cursor-default disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          cheio
        </button>
      </div>
      <div role="meter" aria-label="PS atuais" aria-valuemin={0} aria-valuemax={max} aria-valuenow={current} className="mt-1.5">
        <HpTrack current={current} max={max} preview={current ? preview : null} />
      </div>
    </div>
  );
}

export default memo(HpBar);
