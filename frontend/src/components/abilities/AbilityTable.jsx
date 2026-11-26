import { memo } from 'react';
import ShowMoreButton from '../ShowMoreButton';
import { LearnersRow, LearnersToggle } from '../moves/LearnersToggle';
import { useIncrementalList } from '../../hooks/useIncrementalList';
import { CELL, HEAD, MOVE_NAME_BUTTON, ROW } from '../moves/moveTableStyles';
import { formatSlug } from '../../utils/filters';
import EmptyState from '../EmptyState';

const COLUMN_COUNT = 5;
// Linhas montadas por lote; as seguintes entram conforme a tabela rola.
const BATCH_SIZE = 60;

const HOLDER_COPY = {
  loading: 'Procurando quem tem...',
  count: (total) => (total === 1 ? 'Pokémon tem' : 'Pokémon têm'),
  empty: 'Nenhum Pokémon tem esta habilidade.',
};

const holdersPanelId = (ability) => `tem-${ability}`;

const AbilityRow = memo(function AbilityRow({ ability, open, onToggle, onSelectAbility, loadHolders, entryByName, onSelectPokemon }) {
  const { slug, generation, effect, holders } = ability;
  const panelId = holdersPanelId(slug);
  return (
    <>
      <tr className={`${ROW} ${open ? 'bg-olive/10' : ''}`}>
        <td className={`${CELL} whitespace-nowrap`}>
          <button type="button" onClick={() => onSelectAbility(slug)} className={MOVE_NAME_BUTTON}>
            {formatSlug(slug)}
          </button>
        </td>
        <td lang="en" className={`${CELL} text-smeargle-textDim max-md:hidden`}>{effect || '—'}</td>
        <td className={`${CELL} text-right font-mono tabular-nums max-sm:hidden`}>{generation}ª</td>
        <td className={`${CELL} text-right font-mono tabular-nums`}>{holders.length}</td>
        <td className={`${CELL} text-right`}>
          <LearnersToggle
            move={slug}
            open={open}
            panelId={panelId}
            onToggle={() => onToggle(slug)}
            label={`Pokémon com ${formatSlug(slug)}`}
          />
        </td>
      </tr>
      {open && (
        <LearnersRow
          columns={COLUMN_COUNT}
          id={panelId}
          move={slug}
          load={loadHolders}
          copy={HOLDER_COPY}
          entryByName={entryByName}
          onSelectPokemon={onSelectPokemon}
        />
      )}
    </>
  );
});

/**
 * Todas as habilidades, no desenho da tabela de golpes. O nome abre os detalhes da habilidade e o botão
 * "Pokémon" abre, logo abaixo da linha, quem a tem (a oculta vem marcada).
 * `abilities`: [{ slug, generation, effect, holders }].
 */
function AbilityTable({ abilities, openAbility, onToggleAbility, onSelectAbility, loadHolders, entryByName, onSelectPokemon }) {
  const batch = useIncrementalList(abilities, BATCH_SIZE);

  if (abilities.length === 0) {
    return <EmptyState title="nenhuma habilidade com esses filtros" hint="Ajuste a busca ou a geração." />;
  }

  return (
    <>
      <div className="paper-card overflow-x-auto">
        <table className="w-full border-collapse font-reading text-sm text-smeargle-text">
          <thead>
            <tr className="border-b border-umber/20 text-left">
              <th scope="col" className={HEAD}>Habilidade</th>
              <th scope="col" className={`${HEAD} max-md:hidden`}>Efeito</th>
              <th scope="col" className={`${HEAD} text-right max-sm:hidden`}>Geração</th>
              <th scope="col" className={`${HEAD} text-right`}>Pokémon</th>
              <th scope="col" className={`${HEAD} text-right`}><span className="sr-only">Quem tem</span></th>
            </tr>
          </thead>
          <tbody>
            {batch.visible.map((ability) => (
              <AbilityRow
                key={ability.slug}
                ability={ability}
                open={ability.slug === openAbility}
                onToggle={onToggleAbility}
                onSelectAbility={onSelectAbility}
                loadHolders={loadHolders}
                entryByName={entryByName}
                onSelectPokemon={onSelectPokemon}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ShowMoreButton list={batch} />
    </>
  );
}

export default memo(AbilityTable);
