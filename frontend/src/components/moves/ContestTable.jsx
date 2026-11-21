import { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import ShowMoreButton from '../ShowMoreButton';
import { useIncrementalList } from '../../hooks/useIncrementalList';
import { formatSlug } from '../../utils/filters';
import { CONTEST_CATEGORIES } from '../../utils/contests';
import { CELL, HEAD, MOVE_NAME_BUTTON, ROW } from './moveTableStyles';

const COLUMN_COUNT = 6;
const BATCH_SIZE = 60;

const combosPanelId = (slug) => `combos-${slug}`;

/** Corações de apelo (vermelhão) e de jam (tinta): a quantidade é o valor. */
function Hearts({ count, tone, label }) {
  if (!count) return null;
  return (
    <span aria-label={`${label}: ${count}`} title={`${label}: ${count}`} className={`font-mono text-xs tracking-tight ${tone}`}>
      {'♥'.repeat(count)}
    </span>
  );
}

function CategoryLabel({ category }) {
  const meta = CONTEST_CATEGORIES[category];
  if (!meta) return '—';
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold" title={meta.game}>
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

function EffectCell({ effect, jam = false }) {
  if (!effect) return <span className="italic text-smeargle-textDim/70">—</span>;
  return (
    <span className="block min-w-[12rem]">
      <span className="flex items-center gap-1.5">
        <Hearts count={effect.appeal} tone="text-vermilion" label="Apelo" />
        {jam && <Hearts count={effect.jam} tone="text-ink/70" label="Jam" />}
      </span>
      {effect.text && <span className="block text-[13px] leading-snug text-smeargle-text">{effect.text}</span>}
    </span>
  );
}

function ComboList({ title, moves, onSelectMove }) {
  if (moves.length === 0) return null;
  return (
    <div>
      <p className="mb-1 font-hand text-base leading-none text-umber">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {moves.map((slug) => (
          <li key={slug}>
            <button type="button" onClick={() => onSelectMove(slug)} className={`${MOVE_NAME_BUTTON} text-[13px]`}>{formatSlug(slug)}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ContestRow = memo(function ContestRow({ move, open, onToggle, onSelectMove }) {
  const comboCount = move.combos.length + move.superCombos.length;
  const panelId = combosPanelId(move.slug);
  return (
    <>
      <tr className={`${ROW} align-top ${open ? 'bg-olive/10' : ''}`}>
        <td className={CELL}>
          <button type="button" onClick={() => onSelectMove(move.slug)} className={MOVE_NAME_BUTTON}>{formatSlug(move.slug)}</button>
          <span className="mt-1 block sm:hidden">{move.type && <PokemonTypeBadge type={move.type} />}</span>
        </td>
        <td className={`${CELL} max-sm:hidden`}>{move.type && <PokemonTypeBadge type={move.type} />}</td>
        <td className={CELL}><CategoryLabel category={move.category} /></td>
        <td className={CELL}><EffectCell effect={move.contest} jam /></td>
        <td className={`${CELL} max-lg:hidden`}><EffectCell effect={move.superContest} /></td>
        <td className={`${CELL} text-right`}>
          {comboCount > 0 && (
            <button
              type="button"
              onClick={() => onToggle(move.slug)}
              aria-expanded={open}
              aria-controls={panelId}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[3px] border-[1.5px] border-ink/50 px-2 py-0.5 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-paper-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
            >
              Combos <span className="font-mono tabular-nums text-umber">{comboCount}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr id={panelId} className="border-b border-sepia/10 bg-olive/5">
          <td colSpan={COLUMN_COUNT} className="space-y-2 px-3 pb-3 pt-1">
            <p className="text-xs italic text-smeargle-textDim">Usar {formatSlug(move.slug)} e, logo depois, um destes golpes rende pontos a mais.</p>
            <ComboList title="nos Contests" moves={move.combos} onSelectMove={onSelectMove} />
            <ComboList title="nos Super Contests" moves={move.superCombos} onSelectMove={onSelectMove} />
          </td>
        </tr>
      )}
    </>
  );
});

/**
 * Golpes nos Contests: categoria, apelo e jam com o efeito (3ª geração e ORAS), o efeito no Super Contest (4ª geração)
 * e, recolhidos, os combos. O nome abre os detalhes do golpe.
 */
function ContestTable({ moves, openMove, onToggleMove, onSelectMove }) {
  const batch = useIncrementalList(moves, BATCH_SIZE);

  if (moves.length === 0) {
    return (
      <p className="py-16 text-center font-reading text-sm italic text-smeargle-textDim/80">
        Nenhum golpe encontrado. Ajuste a busca, o tipo ou a categoria do Contest.
      </p>
    );
  }

  return (
    <>
      <p className="font-reading text-sm italic text-brown">
        <span className="text-vermilion">♥</span> apelo e <span className="text-ink/70">♥</span> jam nos Contests
        (Ruby, Sapphire, Emerald e ORAS); Super Contest é o de Diamond, Pearl e Platinum.
      </p>
      <div className="paper-card overflow-x-auto">
        <table className="w-full border-collapse font-reading text-sm text-smeargle-text">
          <thead>
            <tr className="border-b border-umber/20 text-left">
              <th scope="col" className={HEAD}>Golpe</th>
              <th scope="col" className={`${HEAD} max-sm:hidden`}>Tipo</th>
              <th scope="col" className={HEAD}>Categoria</th>
              <th scope="col" className={HEAD}>Contest</th>
              <th scope="col" className={`${HEAD} max-lg:hidden`}>Super Contest</th>
              <th scope="col" className={`${HEAD} text-right`}><span className="sr-only">Combos</span></th>
            </tr>
          </thead>
          <tbody>
            {batch.visible.map((move) => (
              <ContestRow
                key={move.slug}
                move={move}
                open={move.slug === openMove}
                onToggle={onToggleMove}
                onSelectMove={onSelectMove}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ShowMoreButton list={batch} />
    </>
  );
}

export default memo(ContestTable);
