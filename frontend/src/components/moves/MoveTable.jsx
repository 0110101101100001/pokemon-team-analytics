import { memo } from 'react';
import { LearnersRow, LearnersToggle } from './LearnersToggle';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { formatSlug } from '../../utils/filters';
import { CELL, DAMAGE_CLASS_LABELS, HEAD, MOVE_NAME_BUTTON, ROW } from './moveTableStyles';

const COLUMN_COUNT = 7;

const learnersPanelId = (move) => `aprendem-${move}`;

const MoveRow = memo(function MoveRow({ move, open, onToggle, onSelectMove, entryByName, onSelectPokemon }) {
  const { slug, type, damageClass, power, accuracy, pp } = move;
  const panelId = learnersPanelId(slug);
  return (
    <>
      <tr className={`${ROW} ${open ? 'bg-[#829b72]/10' : ''}`}>
        <td className={CELL}>
          <button type="button" onClick={() => onSelectMove(slug)} className={MOVE_NAME_BUTTON}>
            {formatSlug(slug)}
          </button>
        </td>
        <td className={CELL}>{type && <PokemonTypeBadge type={type} />}</td>
        <td className={`${CELL} text-smeargle-textDim max-sm:hidden`}>{DAMAGE_CLASS_LABELS[damageClass] ?? '—'}</td>
        <td className={`${CELL} text-right font-mono tabular-nums`}>{power ?? '—'}</td>
        <td className={`${CELL} text-right font-mono tabular-nums max-sm:hidden`}>{accuracy ? `${accuracy}%` : '—'}</td>
        <td className={`${CELL} text-right font-mono tabular-nums max-md:hidden`}>{pp ?? '—'}</td>
        <td className={`${CELL} text-right`}>
          <LearnersToggle move={slug} open={open} panelId={panelId} onToggle={() => onToggle(slug)} />
        </td>
      </tr>
      {open && (
        <LearnersRow
          columns={COLUMN_COUNT}
          id={panelId}
          move={slug}
          entryByName={entryByName}
          onSelectPokemon={onSelectPokemon}
        />
      )}
    </>
  );
});

/**
 * Todos os golpes, no desenho da tabela de TMs. O nome abre os detalhes do golpe e o botão "Pokémon"
 * abre, logo abaixo da linha, quem o aprende. `moves`: [{ slug, type, damageClass, power, accuracy, pp }].
 */
function MoveTable({ moves, openMove, onToggleMove, onSelectMove, entryByName, onSelectPokemon }) {
  if (moves.length === 0) {
    return (
      <p className="py-16 text-center font-reading text-sm italic text-smeargle-textDim/80">
        Nenhum golpe encontrado. Ajuste a busca, o tipo ou a categoria.
      </p>
    );
  }

  return (
    <div className="paper-card overflow-x-auto">
      <table className="w-full border-collapse font-reading text-sm text-smeargle-text">
        <thead>
          <tr className="border-b border-[#78614E]/20 text-left">
            <th scope="col" className={HEAD}>Golpe</th>
            <th scope="col" className={HEAD}>Tipo</th>
            <th scope="col" className={`${HEAD} max-sm:hidden`}>Categoria</th>
            <th scope="col" className={`${HEAD} text-right`}>Poder</th>
            <th scope="col" className={`${HEAD} text-right max-sm:hidden`}>Precisão</th>
            <th scope="col" className={`${HEAD} text-right max-md:hidden`}>PP</th>
            <th scope="col" className={`${HEAD} text-right`}><span className="sr-only">Quem aprende</span></th>
          </tr>
        </thead>
        <tbody>
          {moves.map((move) => (
            <MoveRow
              key={move.slug}
              move={move}
              open={move.slug === openMove}
              onToggle={onToggleMove}
              onSelectMove={onSelectMove}
              entryByName={entryByName}
              onSelectPokemon={onSelectPokemon}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(MoveTable);
