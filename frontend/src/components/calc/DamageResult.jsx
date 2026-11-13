import { memo } from 'react';
import { damagePercent } from '../../utils/damage';
import { formatSlug } from '../../utils/filters';

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
      <section className="paper-card paper-ruled paper-taped py-[1.6rem] pl-12 pr-5" aria-label="Resultado" aria-live="polite">
        <p className="font-hand text-2xl leading-[1.6rem] text-[#78614E]">a conta ainda está em branco…</p>
        <p className="font-hand text-xl leading-[1.6rem] text-[#5C4033]">{hint}</p>
      </section>
    );
  }

  const { attackerName, defenderName, move, result, ko } = entry;
  const { rolls, extraRolls, hits, min, max, hp, typeMultiplier, stab, crit, reason } = result;

  return (
    <section className="paper-card paper-taped px-4 pb-3.5 pt-5" aria-label="Resultado" aria-live="polite">
      <p className="font-hand text-lg leading-none text-[#78614E]">
        {formatSlug(attackerName)} usa {formatSlug(move.slug)}{crit ? ' (crítico)' : ''} em {formatSlug(defenderName)}
      </p>

      {reason ? (
        <p className="mt-2 font-serif text-base font-bold text-[#8A3B27]">{reason}</p>
      ) : (
        <>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <p className="font-serif text-3xl font-black tabular-nums tracking-tight text-[#2A2421]">
              <span className="ink-splotch">{min}</span> – {max}
            </p>
            <p className="font-mono text-base font-bold tabular-nums text-[#78614E]">
              {damagePercent(min, hp)}% – {damagePercent(max, hp)}%
              <span className="ml-1 font-sans text-[11px] font-semibold">de {hp} HP</span>
            </p>
          </div>
          <p className="mt-1 font-serif text-base font-bold text-[#2A2421]">{ko.text}</p>
          <p className="font-serif text-xs italic text-smeargle-textDim">
            {effectLabel(typeMultiplier)}{stab ? ' · com STAB' : ''}{hits > 1 ? ` · ${hits} acertos` : ''}{extraRolls ? ' · Parental Bond (2º acerto ×0,25)' : ''}
          </p>

          {/* Barra de HP do alvo: o trecho escuro cai sempre; o listrado depende do fator aleatório. */}
          <div className="relative mt-2.5 h-3 overflow-hidden rounded-full border border-[#78614E]/25 bg-smeargle-olive/45" role="img" aria-label={`O alvo perde de ${damagePercent(min, hp)}% a ${damagePercent(max, hp)}% do HP`}>
            <span className="absolute inset-y-0 right-0 bg-[#B5543C]/35 [background-image:repeating-linear-gradient(135deg,transparent_0_4px,rgba(138,59,39,0.45)_4px_7px)]" style={{ width: share(max, hp) }} />
            <span className="absolute inset-y-0 right-0 bg-[#8A3B27]" style={{ width: share(min, hp) }} />
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer font-hand text-base leading-none text-[#78614E] focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60">
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
