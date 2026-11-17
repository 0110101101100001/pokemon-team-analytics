import { memo } from 'react';
import { LearnersRow, LearnersToggle } from '../moves/LearnersToggle';
import { CELL, HEAD, MOVE_NAME_BUTTON, ROW } from '../moves/moveTableStyles';
import { formatSlug } from '../../utils/filters';

const COLUMN_COUNT = 5;

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
      <tr className={`${ROW} ${open ? 'bg-[#829b72]/10' : ''}`}>
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
  if (abilities.length === 0) {
    return (
      <p className="py-16 text-center font-reading text-sm italic text-smeargle-textDim/80">
        Nenhuma habilidade encontrada. Ajuste a busca, a geração ou o tipo.
      </p>
    );
  }

  return (
    <div className="paper-card overflow-x-auto">
      <table className="w-full border-collapse font-reading text-sm text-smeargle-text">
        <thead>
          <tr className="border-b border-[#78614E]/20 text-left">
            <th scope="col" className={HEAD}>Habilidade</th>
            <th scope="col" className={`${HEAD} max-md:hidden`}>Efeito</th>
            <th scope="col" className={`${HEAD} text-right max-sm:hidden`}>Geração</th>
            <th scope="col" className={`${HEAD} text-right`}>Pokémon</th>
            <th scope="col" className={`${HEAD} text-right`}><span className="sr-only">Quem tem</span></th>
          </tr>
        </thead>
        <tbody>
          {abilities.map((ability) => (
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
  );
}

export default memo(AbilityTable);
