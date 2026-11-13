import { memo, useCallback } from 'react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import SuggestField from '../SuggestField';
import { fetchMoveSummary } from '../../services/api';
import { defaultHits } from './calcState';

const CATEGORY_LABELS = { physical: 'Físico', special: 'Especial', status: 'Status' };

const hitRange = ({ minHits, maxHits }) => Array.from({ length: maxHits - minHits + 1 }, (_, i) => minHits + i);

/**
 * Um dos quatro golpes de um lado: escolha do golpe, tipo, categoria e poder, crítico e,
 * nos golpes de vários acertos com número variável, quantos acertos entram na conta.
 */
function MoveSlot({ index, slot, learnset, onChange }) {
  const { move } = slot;
  const isStatus = move?.damageClass === 'status';
  const variableHits = move?.maxHits > move?.minHits;

  const patch = useCallback((changes) => onChange(index, changes), [index, onChange]);
  const pickMove = useCallback((slug) => {
    if (!slug) {
      onChange(index, { move: null, hits: 1, crit: false });
      return;
    }
    fetchMoveSummary(slug).then((summary) => summary && onChange(index, { move: summary, hits: defaultHits(summary) }));
  }, [index, onChange]);

  return (
    <li className="rounded-xl border border-[#5C4033]/25 bg-[#FFFEFB]/60 p-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SuggestField
            label={`Golpe ${index + 1}`}
            placeholder={`Golpe ${index + 1}`}
            value={move?.slug ?? null}
            options={learnset}
            onPick={pickMove}
          />
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-1 font-hand text-base leading-none text-[#78614E]" title="Golpe crítico">
          <input
            type="checkbox"
            checked={slot.crit}
            disabled={!move || isStatus}
            onChange={(e) => patch({ crit: e.target.checked })}
            className="h-4 w-4 cursor-pointer accent-[#829b72] disabled:cursor-not-allowed"
          />
          crít.
        </label>
      </div>

      {move && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-smeargle-textDim">
          <PokemonTypeBadge type={move.type} className="!px-1.5 !text-[8px]" />
          <span>{CATEGORY_LABELS[move.damageClass]}</span>
          {isStatus ? (
            <span className="font-serif italic">· não causa dano</span>
          ) : (
            <span className="font-mono tabular-nums">· poder {move.power ?? 'variável'}</span>
          )}
          {variableHits && (
            <label className="ml-auto flex items-center gap-1 font-hand text-base leading-none text-[#78614E]">
              acertos
              <select
                value={slot.hits}
                onChange={(e) => patch({ hits: Number(e.target.value) })}
                aria-label={`Acertos do golpe ${index + 1}`}
                className="h-7 cursor-pointer rounded-lg border border-[#78614E]/25 bg-[#FFFEFB]/80 px-1 font-mono text-xs tabular-nums text-smeargle-text shadow-inner focus:border-smeargle-olive focus:outline-none focus:ring-2 focus:ring-smeargle-olive/50"
              >
                {hitRange(move).map((hits) => <option key={hits} value={hits}>{hits}×</option>)}
              </select>
            </label>
          )}
          {move.maxHits > 1 && !variableHits && <span>· {move.maxHits} acertos</span>}
        </div>
      )}
    </li>
  );
}

export default memo(MoveSlot);
