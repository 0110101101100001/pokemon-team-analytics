import { memo } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import MoveLearners from './MoveLearners';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { formatSlug } from '../../utils/filters';
import { CELL, DAMAGE_CLASS_LABELS, HEAD, MOVE_NAME_BUTTON, ROW } from './moveTableStyles';

const COLUMN_COUNT = 7;

const learnersPanelId = (move) => `aprendem-${move}`;

const MoveRow = memo(function MoveRow({ move, open, onToggle, onSelectMove, entryByName, onSelectPokemon }) {
  const { slug, type, damageClass, power, accuracy, pp } = move;
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
          <button
            type="button"
            onClick={() => onToggle(slug)}
            aria-expanded={open}
            aria-controls={open ? learnersPanelId(slug) : undefined}
            aria-label={`Pokémon que aprendem ${formatSlug(slug)}`}
            className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] border-[1.5px] border-[#1C1A17] px-2 font-reading text-[13px] font-semibold leading-none text-[#1C1A17] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt sm:px-2.5 ${
              open ? 'bg-[#E6D9BE]' : 'bg-paper hover:bg-[#E6D9BE]'
            }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="max-sm:hidden">Pokémon</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-[#5C4033]/10 bg-[#E6D9BE]/35">
          <td colSpan={COLUMN_COUNT} className="px-3">
            <MoveLearners
              id={learnersPanelId(slug)}
              move={slug}
              entryByName={entryByName}
              onSelectPokemon={onSelectPokemon}
            />
          </td>
        </tr>
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
