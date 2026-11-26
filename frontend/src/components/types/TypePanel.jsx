import { memo, useMemo } from 'react';
import { BookOpen, Shield, Swords } from 'lucide-react';
import { TYPE_NAMES, defensiveProfile, offensiveProfile } from '../../data/typeChart';
import { capitalize } from '../../utils/typeColors';

const CHIP = 'type-chip cursor-pointer !text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt focus-visible:ring-offset-1';

/** Chips clicáveis de tipo: clicar troca o tipo escolhido. */
function TypeChips({ types, onSelect }) {
  if (types.length === 0) return <p className="font-reading text-sm italic text-ink-soft">Nenhum</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {types.map((type) => (
        <li key={type}>
          <button type="button" onClick={() => onSelect(type)} data-type={type} className={CHIP} aria-label={`Ver ${capitalize(type)}`}>
            {capitalize(type)}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Group({ label, multiplier, types, onSelect }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-baseline gap-2 font-reading text-sm font-semibold text-ink">
        {label}
        <span className="font-mono text-xs font-bold text-muted">{multiplier}</span>
      </p>
      <TypeChips types={types} onSelect={onSelect} />
    </div>
  );
}

/**
 * Resumo de um tipo: no ataque, quem ele acerta bem, mal ou não afeta; na defesa, de quem leva 2×, o que resiste
 * e a que é imune. Sem tipo escolhido, mostra os 18 para escolher. "Ver Pokémon desse tipo" abre a Pokédex filtrada.
 */
function TypePanel({ type, onSelect, onShowPokemon }) {
  const offense = useMemo(() => (type ? offensiveProfile(type) : null), [type]);
  const defense = useMemo(() => (type ? defensiveProfile([type]) : null), [type]);

  return (
    <section aria-labelledby="tipos-resumo" className="paper-card space-y-4 p-4 sm:p-5">
      <h3 id="tipos-resumo" className="section-title !mb-0">
        {type ? <>Resumo do tipo <span className="type-chip !text-xs" data-type={type}>{capitalize(type)}</span></> : 'Resumo de um tipo'}
      </h3>

      {!type ? (
        <div className="space-y-2">
          <p className="font-reading text-sm italic text-ink-soft">Toque num tipo da matriz ou escolha aqui.</p>
          <TypeChips types={TYPE_NAMES} onSelect={onSelect} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brown">
                <Swords className="h-3.5 w-3.5" aria-hidden="true" />
                No ataque
              </p>
              <Group label="Ataca bem" multiplier="2×" types={offense.superEffective} onSelect={onSelect} />
              <Group label="Ataca mal" multiplier="½×" types={offense.notVery} onSelect={onSelect} />
              <Group label="Não afeta" multiplier="0×" types={offense.noEffect} onSelect={onSelect} />
            </div>
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brown">
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                Na defesa
              </p>
              <Group label="Defende mal (recebe 2×)" multiplier="2×" types={defense.x2} onSelect={onSelect} />
              <Group label="Resiste" multiplier="½×" types={defense.x05} onSelect={onSelect} />
              <Group label="Imune" multiplier="0×" types={defense.x0} onSelect={onSelect} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <button type="button" onClick={() => onSelect(null)} className="btn-outline !min-h-9 !px-3 !py-1 !text-xs">
              Escolher outro tipo
            </button>
            <button type="button" onClick={() => onShowPokemon(type)} className="btn-action !h-9 font-serif">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Ver Pokémon desse tipo
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default memo(TypePanel);
