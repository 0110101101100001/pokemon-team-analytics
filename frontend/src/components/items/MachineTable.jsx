import { memo } from 'react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { formatSlug } from '../../utils/filters';

const DAMAGE_CLASS_LABELS = { physical: 'Físico', special: 'Especial', status: 'Status' };
const HEAD = 'px-3 pb-1.5 pt-3 font-hand text-lg font-semibold leading-none text-[#78614E]';
const CELL = 'px-3 py-1.5';

/** Lista de TMs, HMs e TRs de um jogo. `machines`: [{ code, move, type, damageClass, power, accuracy }]. */
function MachineTable({ machines, onSelectMove }) {
  if (machines.length === 0) {
    return (
      <p className="py-16 text-center font-serif text-sm italic text-smeargle-textDim/80">
        Nenhuma máquina encontrada. Ajuste a busca ou o tipo.
      </p>
    );
  }

  return (
    <div className="paper-card overflow-x-auto">
      <table className="w-full border-collapse font-serif text-sm text-smeargle-text">
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
            <tr key={code} className="border-b border-[#5C4033]/10 transition-colors last:border-0 hover:bg-[#829b72]/10">
              <td className={`${CELL} whitespace-nowrap font-mono text-xs font-bold tracking-wider text-[#4A3B32]`}>{code.toUpperCase()}</td>
              <td className={CELL}>
                <button
                  type="button"
                  onClick={() => onSelectMove(move)}
                  className="cursor-pointer rounded font-semibold underline decoration-[#78614E]/35 decoration-dashed underline-offset-4 transition-colors hover:text-[#5B7856] hover:decoration-[#5B7856] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#829b72]/70"
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
