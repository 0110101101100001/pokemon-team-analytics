import { memo } from 'react';
import { thumbnailSpriteUrl } from '../../services/api';
import { damagePercent } from '../../utils/damage';
import { formatSlug } from '../../utils/filters';

/**
 * Os golpes dos dois lados, um contra o outro, com a faixa de dano e o veredito de cada um.
 * Tocar numa linha mostra o detalhe dela no resultado acima.
 */
function ResultsList({ directions, selected, onSelect }) {
  if (directions.every((direction) => direction.rows.length === 0)) return null;

  return (
    <section className="paper-card space-y-3 p-3.5 sm:p-4" aria-label="Todos os golpes">
      {directions.map(({ key, attacker, defender, rows }) => rows.length > 0 && (
        <div key={key}>
          <p className="mb-1 flex items-center gap-1 font-hand text-base leading-none text-[#5C4033]">
            <img src={thumbnailSpriteUrl(attacker.id)} alt="" width={28} height={28} loading="lazy" decoding="async" className="h-7 w-7 object-contain" />
            {formatSlug(attacker.name)} → {formatSlug(defender.name)}
          </p>
          <ul className="space-y-1">
            {rows.map(({ slotIndex, move, result, ko }) => {
              const isSelected = selected.side === key && selected.slot === slotIndex;
              return (
                <li key={slotIndex}>
                  <button
                    type="button"
                    onClick={() => onSelect({ side: key, slot: slotIndex })}
                    aria-pressed={isSelected}
                    className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
                      isSelected ? 'border-smeargle-olive bg-smeargle-olive/15' : 'border-transparent hover:border-[#78614E]/25 hover:bg-[#78614E]/5'
                    }`}
                  >
                    <span className="truncate font-serif text-sm font-semibold text-smeargle-text">
                      {formatSlug(move.slug)}{move.crit ? ' (crít.)' : ''}
                    </span>
                    <span className="font-mono text-xs font-bold tabular-nums text-[#78614E]">
                      {result.reason ? '—' : `${damagePercent(result.min, result.hp)}–${damagePercent(result.max, result.hp)}%`}
                    </span>
                    <span className="col-span-2 truncate font-serif text-[11px] italic text-smeargle-textDim">{ko.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default memo(ResultsList);
