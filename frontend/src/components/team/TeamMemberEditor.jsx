import { memo, useCallback } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import SuggestField from '../SuggestField';
import StatSpreadEditor from '../battle/StatSpreadEditor';
import { fetchItemNames, fetchMoveSummary, officialSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { clampLevel } from '../../utils/stats';
import { usePokemonBattleData } from '../../hooks/usePokemonBattleData';

const DAMAGE_CLASS_LABELS = { physical: 'Físico', special: 'Especial', status: 'Status' };
const MOVE_SLOTS = [0, 1, 2, 3];

function MoveField({ index, move, learnset, onPick }) {
  const handlePick = useCallback((slug) => onPick(index, slug), [index, onPick]);

  return (
    <li>
      <SuggestField
        label={`Golpe ${index + 1}`}
        placeholder={`Golpe ${index + 1}`}
        value={move?.slug ?? null}
        options={learnset}
        onPick={handlePick}
      />
      <p className="mt-1 flex h-5 items-center gap-1.5 text-[11px] font-medium text-smeargle-textDim">
        {move && (
          <>
            <PokemonTypeBadge type={move.type} className="!px-1.5 !text-[8px]" />
            {DAMAGE_CLASS_LABELS[move.damageClass]}
            {move.power ? ` · poder ${move.power}` : ''}
          </>
        )}
      </p>
    </li>
  );
}

/** Editor do set de um membro do time: item, nível, natureza, EVs/IVs e os quatro golpes. */
function TeamMemberEditor({ member, onChange }) {
  const { id, name, types, set } = member;
  const battle = usePokemonBattleData(name);

  const patch = useCallback((changes) => onChange(id, changes), [id, onChange]);
  const pickItem = useCallback((slug) => patch({ item: slug ?? '' }), [patch]);

  const pickMove = useCallback((index, slug) => {
    const place = (move) => onChange(id, (current) => ({ moves: current.moves.map((kept, i) => (i === index ? move : kept)) }));
    if (!slug) {
      place(null);
      return;
    }
    fetchMoveSummary(slug).then((summary) => summary && place(summary));
  }, [id, onChange]);

  return (
    <section className="paper-card ink-blotted p-4 pt-5 sm:p-5 sm:pt-6" aria-label={`Set de ${formatSlug(name)}`}>
      <header className="flex items-center gap-3 border-b border-[#5C4033]/25 pb-3">
        <img src={officialSpriteUrl(id)} alt="" width={72} height={72} decoding="async" className="h-[72px] w-[72px] shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="font-hand text-lg leading-none text-[#78614E]">ficha de batalha</p>
          <h3 className="truncate font-serif text-xl font-black tracking-tight text-[#2A2421]">{formatSlug(name)}</h3>
          <div className="mt-1 flex gap-1">{types.map((type) => <PokemonTypeBadge key={type} type={type} />)}</div>
        </div>
        <label className="w-16 shrink-0">
          <span className="paper-label">Nível</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={set.level}
            onChange={(e) => patch({ level: clampLevel(e.target.value) })}
            className="paper-field px-1.5 text-center font-mono tabular-nums"
          />
        </label>
      </header>

      {battle.status === 'error' && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-xs font-medium text-[#8A3B27]">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Não foi possível carregar os atributos e golpes deste Pokémon.
        </p>
      )}

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <span className="paper-label">Item</span>
            <SuggestField
              label="Item segurado"
              placeholder="Item (ex.: Leftovers)"
              value={set.item || null}
              loadOptions={fetchItemNames}
              onPick={pickItem}
            />
          </div>

          <div>
            <span className="paper-label flex items-center gap-1.5">
              Golpes
              {battle.status === 'loading' && <Loader2 className="h-3 w-3 animate-spin" aria-label="carregando golpes" />}
            </span>
            <ul className="space-y-1">
              {MOVE_SLOTS.map((index) => (
                <MoveField key={index} index={index} move={set.moves[index]} learnset={battle.learnset} onPick={pickMove} />
              ))}
            </ul>
          </div>
        </div>

        <StatSpreadEditor baseStats={battle.baseStats} set={set} onChange={patch} />
      </div>
    </section>
  );
}

export default memo(TeamMemberEditor);
