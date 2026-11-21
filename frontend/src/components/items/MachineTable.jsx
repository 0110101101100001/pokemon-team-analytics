import { memo, useCallback } from 'react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { LearnersRow, LearnersToggle } from '../moves/LearnersToggle';
import { fetchMachineLearners, hasMachineLearners } from '../../services/machineLearners';
import { formatSlug } from '../../utils/filters';
import { CELL, DAMAGE_CLASS_LABELS, HEAD, MOVE_NAME_BUTTON, ROW } from '../moves/moveTableStyles';

const learnersPanelId = (code) => `aprendem-${code}`;

const MachineRow = memo(function MachineRow({
  machine, columns, open, onToggle, onSelectMove, loadLearners, context, entryByName, onSelectPokemon,
}) {
  const { code, move, type, damageClass, power, accuracy } = machine;
  const panelId = learnersPanelId(code);
  return (
    <>
      <tr className={`${ROW} ${open ? 'bg-olive/10' : ''}`}>
        <td className={`${CELL} whitespace-nowrap font-mono text-xs font-bold tracking-wider text-ink-soft`}>{code.toUpperCase()}</td>
        <td className={CELL}>
          <button type="button" onClick={() => onSelectMove(move)} className={MOVE_NAME_BUTTON}>
            {formatSlug(move)}
          </button>
        </td>
        <td className={CELL}>{type && <PokemonTypeBadge type={type} />}</td>
        <td className={`${CELL} text-smeargle-textDim max-sm:hidden`}>{DAMAGE_CLASS_LABELS[damageClass] ?? '—'}</td>
        <td className={`${CELL} text-right font-mono tabular-nums`}>{power ?? '—'}</td>
        <td className={`${CELL} text-right font-mono tabular-nums max-sm:hidden`}>{accuracy ? `${accuracy}%` : '—'}</td>
        {loadLearners && (
          <td className={`${CELL} text-right`}>
            <LearnersToggle move={move} open={open} panelId={panelId} onToggle={() => onToggle(code)} />
          </td>
        )}
      </tr>
      {open && loadLearners && (
        <LearnersRow
          columns={columns}
          id={panelId}
          move={move}
          load={loadLearners}
          context={`por ${code.slice(0, 2).toUpperCase()} em ${context}`}
          entryByName={entryByName}
          onSelectPokemon={onSelectPokemon}
        />
      )}
    </>
  );
});

/**
 * Lista de TMs, HMs e TRs de um jogo. `machines`: [{ code, move, type, damageClass, power, accuracy }].
 * O botão "Pokémon" abre quem aprende o golpe por máquina naquele jogo; some nos jogos sem esses dados na PokéAPI.
 */
function MachineTable({ machines, gameId, gameLabel, openCode, onToggle, onSelectMove, entryByName, onSelectPokemon }) {
  const withLearners = hasMachineLearners(gameId);
  const loadLearners = useCallback((move) => fetchMachineLearners(gameId, move), [gameId]);
  const columns = withLearners ? 7 : 6;

  if (machines.length === 0) {
    return (
      <p className="py-16 text-center font-reading text-sm italic text-smeargle-textDim/80">
        Nenhum item encontrado. Ajuste a busca ou o tipo.
      </p>
    );
  }

  return (
    <div className="paper-card overflow-x-auto">
      <table className="w-full border-collapse font-reading text-sm text-smeargle-text">
        <thead>
          <tr className="border-b border-umber/20 text-left">
            <th scope="col" className={HEAD}>Nº</th>
            <th scope="col" className={HEAD}>Golpe</th>
            <th scope="col" className={HEAD}>Tipo</th>
            <th scope="col" className={`${HEAD} max-sm:hidden`}>Categoria</th>
            <th scope="col" className={`${HEAD} text-right`}>Poder</th>
            <th scope="col" className={`${HEAD} text-right max-sm:hidden`}>Precisão</th>
            {withLearners && <th scope="col" className={`${HEAD} text-right`}><span className="sr-only">Quem aprende</span></th>}
          </tr>
        </thead>
        <tbody>
          {machines.map((machine) => (
            <MachineRow
              key={machine.code}
              machine={machine}
              columns={columns}
              open={machine.code === openCode}
              onToggle={onToggle}
              onSelectMove={onSelectMove}
              loadLearners={withLearners ? loadLearners : null}
              context={gameLabel}
              entryByName={entryByName}
              onSelectPokemon={onSelectPokemon}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(MachineTable);
