import { memo } from 'react';
import { damagePercent } from '../../utils/damage';
import { formatSlug } from '../../utils/filters';
import { barTone } from './BattleScoreboard';

const effectLabel = (multiplier) => {
  if (multiplier > 1) return `super efetivo ×${multiplier}`;
  if (multiplier < 1) return `pouco efetivo ×${multiplier.toLocaleString('pt-BR')}`;
  return 'efetividade neutra';
};

const share = (value, hp) => `${Math.min((value / hp) * 100, 100)}%`;

/** Detalhe do golpe escolhido: faixa de dano, percentual do HP, veredito de nocaute e os 16 resultados. */
function DamageResult({ entry, hint }) {
  if (!entry) {
    return (
      <section className="paper-card px-5 py-6" aria-label="Resultado" aria-live="polite">
        <p className="font-hand text-2xl leading-tight text-brown">a conta ainda está em branco…</p>
        <p className="mt-1 font-serif text-lg font-semibold leading-snug text-ink">{hint}</p>
      </section>
    );
  }

  const { attackerName, defenderName, move, result, ko } = entry;
  const { rolls, extraRolls, hits, min, max, hp, typeMultiplier, stab, crit, reason, variablePower } = result;

  return (
    <section className="paper-card px-4 pb-3.5 pt-5" aria-label="Resultado" aria-live="polite">
      <p className="font-hand text-lg leading-none text-umber">
        {formatSlug(attackerName)} usa {move.name ?? formatSlug(move.slug)}{move.poweredFrom ? ` (${formatSlug(move.poweredFrom)})` : ''}{crit ? ' (crítico)' : ''} em {formatSlug(defenderName)}
      </p>

      {reason ? (
        <p className="mt-2 font-serif text-base font-bold text-vermilion-deep">{reason}</p>
      ) : (
        <>
          {/* O percentual é o que decide a jogada: ele vem grande; o dano em pontos fica como nota. */}
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <p className="font-serif text-4xl font-black tabular-nums tracking-tight text-ink sm:text-5xl">
              <span className="ink-splotch">{damagePercent(min, hp)}</span>–{damagePercent(max, hp)}<span className="text-2xl sm:text-3xl">%</span>
            </p>
            <p className="font-mono text-sm font-bold tabular-nums text-umber">
              {min}–{max}
              <span className="ml-1 font-sans text-[11px] font-semibold">de {hp} HP</span>
            </p>
          </div>
          <p className="mt-1 font-serif text-base font-bold text-ink">{ko.text}</p>
          <p className="font-reading text-xs italic text-smeargle-textDim">
            {variablePower && `poder ${variablePower.power} (${variablePower.note}) · `}
            {effectLabel(typeMultiplier)}{stab ? ' · com STAB' : ''}{hits > 1 ? ` · ${hits} acertos` : ''}{extraRolls ? ' · Parental Bond (2º acerto ×0,25)' : ''}
          </p>

          {/* Barra de HP do alvo: o trecho escuro cai sempre; o listrado depende do fator aleatório. */}
          <div className={`hp-brush relative mt-3 h-4 overflow-hidden ${barTone(1 - max / hp)}`} role="img" aria-label={`O alvo perde de ${damagePercent(min, hp)}% a ${damagePercent(max, hp)}% do HP`}>
            <span className="absolute inset-y-0 right-0 bg-danger/25 [background-image:repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_srgb,var(--danger)_45%,transparent)_4px_7px)]" style={{ width: share(max, hp) }} />
            <span className="absolute inset-y-0 right-0 bg-vermilion-deep" style={{ width: share(min, hp) }} />
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer font-hand text-base leading-none text-umber focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt">
              ver os 16 resultados possíveis{hits > 1 ? ' (por acerto)' : ''}
            </summary>
            <p className="mt-1.5 font-mono text-xs tabular-nums leading-relaxed text-smeargle-text">{rolls.join(' · ')}</p>
            {extraRolls && (
              <p className="mt-1 font-mono text-xs tabular-nums leading-relaxed text-smeargle-textDim">
                <span className="font-hand text-sm">2º acerto:</span> {extraRolls.join(' · ')}
              </p>
            )}
          </details>
        </>
      )}
    </section>
  );
}

export default memo(DamageResult);
