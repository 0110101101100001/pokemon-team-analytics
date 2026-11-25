import { memo } from 'react';
import StateChips from './StateChips';
import { thumbnailSpriteUrl } from '../../services/api';

// Cor da barra pela fração de PS: oliva, ocre abaixo da metade, vermelhão abaixo de 1/5.
export const barTone = (fraction) => (fraction > 0.5 ? 'bg-olive' : fraction > 0.2 ? 'bg-ochre' : 'bg-vermilion');
// "109" quando o golpe tira o mesmo nos 16 resultados (ou derruba); senão "62–73".
const damageRange = ({ min, max }, current) => {
  const [low, high] = [Math.min(min, current), Math.min(max, current)];
  return low === high ? `${low}` : `${low}–${high}`;
};
const pct = (value, max) => `${Math.max(0, Math.min(1, value / max)) * 100}%`;

/**
 * Barra de PS com a prévia do golpe escolhido para o turno: o trecho escuro cai sempre (dano mínimo),
 * o listrado depende do fator aleatório (até o máximo).
 */
export function HpTrack({ current, max, preview, className = 'h-3' }) {
  const fraction = max ? current / max : 0;
  const maxHit = preview ? Math.min(preview.max, current) : 0;
  const minHit = preview ? Math.min(preview.min, current) : 0;
  return (
    <div className={`hp-brush relative overflow-hidden bg-ink/10 ${className}`}>
      <span
        className={`absolute inset-y-0 left-0 transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none ${barTone(fraction)}`}
        style={{ width: pct(current, max) }}
      />
      {preview && maxHit > 0 && (
        <>
          <span
            className="absolute inset-y-0 bg-vermilion/30 [background-image:repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_srgb,var(--danger)_50%,transparent)_4px_7px)]"
            style={{ left: pct(current - maxHit, max), width: pct(maxHit, max) }}
          />
          <span className="absolute inset-y-0 bg-vermilion-deep/80" style={{ left: pct(current - minHit, max), width: pct(minHit, max) }} />
        </>
      )}
    </div>
  );
}

function Fighter({ fighter, align }) {
  const { name, spriteId, current, max, preview, side, conditions } = fighter;
  const fainted = current === 0;
  const right = align === 'right';
  return (
    <div className={`min-w-0 ${right ? 'text-right' : ''}`}>
      <div className={`flex items-end gap-2 ${right ? 'flex-row-reverse' : ''}`}>
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <img
            src={thumbnailSpriteUrl(spriteId)}
            alt=""
            width={48}
            height={48}
            decoding="async"
            className={`max-h-full max-w-full object-contain transition-[filter,opacity] duration-500 [image-rendering:pixelated] ${right ? '' : '-scale-x-100'} ${
              fainted ? 'opacity-50 [filter:grayscale(1)_sepia(0.7)]' : ''
            }`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-bold leading-tight text-ink">{name}</p>
          <p className="font-mono text-xs tabular-nums text-umber">
            {current}/{max} PS
            {preview && !fainted && <span className="text-vermilion-deep"> · −{damageRange(preview, current)}</span>}
          </p>
        </div>
      </div>
      <HpTrack current={current} max={max} preview={fainted ? null : preview} className="mt-1.5 h-3.5" />
      <StateChips side={side} conditions={conditions} className={`mt-1.5 ${right ? 'justify-end' : ''}`} />
    </div>
  );
}

/**
 * Placar da batalha: os dois lados de frente, com sprite, PS, a prévia do dano do golpe escolhido para o turno
 * e os selos de estado. Some enquanto falta escolher um dos Pokémon.
 */
function BattleScoreboard({ fighters }) {
  if (fighters.some((fighter) => !fighter)) return null;
  return (
    <section className="paper-card grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 px-3 py-3 sm:gap-4 sm:px-4" aria-label="Placar da batalha">
      <Fighter fighter={fighters[0]} align="left" />
      <span aria-hidden="true" className="self-center font-hand text-xl leading-none text-umber">vs</span>
      <Fighter fighter={fighters[1]} align="right" />
    </section>
  );
}

export default memo(BattleScoreboard);
