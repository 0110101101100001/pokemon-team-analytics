import { memo, useMemo } from 'react';
import {
  MAX_EV, MAX_EV_TOTAL, MAX_IV, NATURES, STAT_KEYS, STAT_LABELS,
  calcStats, clampEv, clampIv, evTotal, natureOf,
} from '../../utils/stats';
import { formatSlug } from '../../utils/filters';

const NUMBER_CLASS =
  'h-8 w-full rounded-lg border border-[#78614E]/25 bg-[#FFFEFB]/70 px-1.5 text-center font-mono text-sm tabular-nums text-smeargle-text shadow-inner transition-colors hover:border-[#78614E]/45 focus:border-smeargle-olive focus:outline-none focus:ring-2 focus:ring-smeargle-olive/60';
const HEAD_CLASS = 'pb-1 text-[10px] font-bold uppercase tracking-wider text-[#78614E]';

const natureLabel = ({ name, plus, minus }) =>
  plus ? `${formatSlug(name)} (+${STAT_LABELS[plus]} −${STAT_LABELS[minus]})` : `${formatSlug(name)} (neutra)`;

const totalClass = (nature, key) => {
  if (nature.plus === key) return 'text-smeargle-ink-darkGreen';
  if (nature.minus === key) return 'text-[#8A3B27]';
  return 'text-smeargle-text';
};

/**
 * Natureza, EVs e IVs de um set, com os atributos finais calculados ao lado.
 * `baseStats` nulo (dados ainda carregando) mostra os campos sem os totais.
 */
function StatSpreadEditor({ baseStats, set, onChange }) {
  const nature = natureOf(set.nature);
  const stats = useMemo(() => (baseStats ? calcStats(baseStats, set) : null), [baseStats, set]);
  const used = evTotal(set.evs);
  const remaining = MAX_EV_TOTAL - used;

  const setEv = (key, value) => onChange({ evs: { ...set.evs, [key]: clampEv(set.evs, key, value) } });
  const setIv = (key, value) => onChange({ ivs: { ...set.ivs, [key]: clampIv(value) } });

  return (
    <div>
      <label className="block">
        <span className="paper-label">Natureza</span>
        <select value={set.nature} onChange={(e) => onChange({ nature: e.target.value })} className="paper-field cursor-pointer">
          {NATURES.map((option) => <option key={option.name} value={option.name}>{natureLabel(option)}</option>)}
        </select>
      </label>

      <table className="mt-3 w-full border-separate border-spacing-x-1.5 border-spacing-y-1">
        <thead>
          <tr>
            <th scope="col" className={`${HEAD_CLASS} text-left`}>Atributo</th>
            <th scope="col" className={`${HEAD_CLASS} w-12`}>Base</th>
            <th scope="col" className={`${HEAD_CLASS} w-[4.5rem]`}>EV</th>
            <th scope="col" className={`${HEAD_CLASS} w-14`}>IV</th>
            <th scope="col" className={`${HEAD_CLASS} w-12 text-right`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {STAT_KEYS.map((key) => (
            <tr key={key}>
              <th scope="row" className="text-left font-serif text-sm font-semibold text-smeargle-text">{STAT_LABELS[key]}</th>
              <td className="text-center font-mono text-sm tabular-nums text-smeargle-textDim">{baseStats?.[key] ?? '—'}</td>
              <td>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_EV}
                  step={4}
                  value={set.evs[key]}
                  onChange={(e) => setEv(key, e.target.value)}
                  aria-label={`EVs de ${STAT_LABELS[key]}`}
                  className={NUMBER_CLASS}
                />
              </td>
              <td>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_IV}
                  value={set.ivs[key]}
                  onChange={(e) => setIv(key, e.target.value)}
                  aria-label={`IV de ${STAT_LABELS[key]}`}
                  className={NUMBER_CLASS}
                />
              </td>
              <td className={`text-right font-mono text-base font-bold tabular-nums ${totalClass(nature, key)}`}>{stats?.[key] ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full border border-[#78614E]/20 bg-[#F7F3EE]" aria-hidden="true">
          <div
            className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${remaining > 0 ? 'bg-smeargle-olive' : 'bg-[#5C4033]'}`}
            style={{ width: `${(used / MAX_EV_TOTAL) * 100}%` }}
          />
        </div>
        <p className="shrink-0 font-mono text-xs font-bold tabular-nums text-[#78614E]" aria-live="polite">
          {used}/{MAX_EV_TOTAL} EVs
          <span className="ml-1.5 font-hand text-base font-normal">{remaining > 0 ? `faltam ${remaining}` : 'completo'}</span>
        </p>
      </div>
    </div>
  );
}

export default memo(StatSpreadEditor);
