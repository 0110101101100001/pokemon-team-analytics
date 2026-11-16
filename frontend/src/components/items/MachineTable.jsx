import { memo } from 'react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { formatSlug } from '../../utils/filters';
import { CELL, DAMAGE_CLASS_LABELS, HEAD, MOVE_NAME_BUTTON, ROW } from '../moves/moveTableStyles';

/** Lista de TMs, HMs e TRs de um jogo. `machines`: [{ code, move, type, damageClass, power, accuracy }]. */
function MachineTable({ machines, onSelectMove }) {
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
          <tr className="border-b border-[#78614E]/20 text-left">
            <th scope="col" className={HEAD}>Nº</th>
            <th scope="col" className={HEAD}>Golpe</th>
            <th scope="col" className={HEAD}>Tipo</th>
            <th scope="col" className={`${HEAD} max-sm:hidden`}>Categoria</th>
            <th scope="col" className={`${HEAD} text-right`}>Poder</th>
            <th scope="col" className={`${HEAD} text-right max-sm:hidden`}>Precisão</th>
          </tr>
        </thead>
        <tbody>
          {machines.map(({ code, move, type, damageClass, power, accuracy }) => (
            <tr key={code} className={ROW}>
              <td className={`${CELL} whitespace-nowrap font-mono text-xs font-bold tracking-wider text-[#4A3B32]`}>{code.toUpperCase()}</td>
              <td className={CELL}>
                <button
                  type="button"
                  onClick={() => onSelectMove(move)}
                  className={MOVE_NAME_BUTTON}
                >
                  {formatSlug(move)}
                </button>
              </td>
              <td className={CELL}>{type && <PokemonTypeBadge type={type} />}</td>
              <td className={`${CELL} text-smeargle-textDim max-sm:hidden`}>{DAMAGE_CLASS_LABELS[damageClass] ?? '—'}</td>
              <td className={`${CELL} text-right font-mono tabular-nums`}>{power ?? '—'}</td>
              <td className={`${CELL} text-right font-mono tabular-nums max-sm:hidden`}>{accuracy ? `${accuracy}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(MachineTable);
