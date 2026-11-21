import { memo, useMemo } from 'react';
import SpecialMoveCard from './SpecialMoveCard';
import { DAMAGE_CLASS_LABELS } from './moveTableStyles';
import { GMAX_MOVE_LIST } from '../../data/gmaxMoves';
import { MAX_MOVES } from '../../data/maxMoves';
import { EXCLUSIVE_Z_MOVES, GENERIC_Z_MOVES } from '../../data/zMoves';
import { resolveTrainerPokemon } from '../../utils/trainers';
import EmptyState from '../EmptyState';

const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3';
const BY_BASE_POWER = 'Pelo golpe base';

/** Filtra por nome e tipo, como a lista de golpes comuns. */
export const matchesMoveFilters = (move, { term, type }) =>
  (!type || move.type === type) && (!term || move.name.toLowerCase().replace(/-/g, ' ').includes(term));

/** Os golpes especiais de cada aba, já filtrados: `max` (Max e G-Max) ou `z` (exclusivos e por tipo). */
export function specialMovesOf(kind, filters) {
  const keep = (list) => list.filter((move) => matchesMoveFilters(move, filters));
  return kind === 'max'
    ? { first: keep(GMAX_MOVE_LIST), second: keep(MAX_MOVES) }
    : { first: keep(EXCLUSIVE_Z_MOVES), second: keep(GENERIC_Z_MOVES) };
}

// Formas fora da grade (Gigantamax, Pikachu de boné) aparecem pela entrada mais próxima da Pokédex.
function usersOf(names, entryByName) {
  const entries = names
    .map((name) => resolveTrainerPokemon(entryByName, name.replace(/-gmax$/, '')))
    .filter(Boolean);
  return [...new Map(entries.map((entry) => [entry.name, entry])).values()];
}

function Group({ title, note, children }) {
  return (
    <section className="space-y-3">
      <header>
        <h3 className="section-title !mb-0">{title}</h3>
        {note && <p className="font-reading text-sm italic text-brown">{note}</p>}
      </header>
      <div className={GRID}>{children}</div>
    </section>
  );
}

/** As abas "Dynamax / G-Max" e "Golpes Z" da seção Movimentos. */
function SpecialMoves({ kind, filters, entryByName, onSelectPokemon }) {
  const { first, second } = useMemo(() => specialMovesOf(kind, filters), [kind, filters]);

  if (first.length + second.length === 0) {
    return <EmptyState title="nenhum golpe com esses filtros" />;
  }

  if (kind === 'max') {
    return (
      <div className="space-y-8">
        {first.length > 0 && (
          <Group title="Golpes G-Max" note="Exclusivos das formas Gigantamax: substituem o golpe Max do mesmo tipo.">
            {first.map((move) => (
              <SpecialMoveCard
                key={move.name}
                name={move.name}
                type={move.type}
                badge="Exclusivo"
                effect={move.effect}
                facts={[['Poder', move.power ? `${move.power}, fixo` : BY_BASE_POWER]]}
                users={usersOf(move.users, entryByName)}
                onSelectPokemon={onSelectPokemon}
              />
            ))}
          </Group>
        )}
        {second.length > 0 && (
          <Group title="Golpes Max" note="Qualquer Pokémon em Dynamax: o golpe de dano de cada tipo vira o golpe Max desse tipo.">
            {second.map((move) => (
              <SpecialMoveCard
                key={move.name}
                name={move.name}
                type={move.type}
                effect={move.effect}
                facts={[['Poder', move.name === 'Max Guard' ? 'Status' : BY_BASE_POWER]]}
              />
            ))}
          </Group>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {first.length > 0 && (
        <Group title="Golpes Z exclusivos" note="Só para certos Pokémon, com o cristal Z próprio e o golpe base certo.">
          {first.map((move) => (
            <SpecialMoveCard
              key={move.name}
              name={move.name}
              type={move.type}
              badge="Exclusivo"
              effect={move.effect}
              facts={[
                ['Categoria', DAMAGE_CLASS_LABELS[move.category]],
                ['Poder', move.power ?? '—'],
                ['Golpe base', move.baseMove],
                ['Cristal Z', move.crystal],
              ]}
              users={usersOf(move.shown, entryByName)}
              onSelectPokemon={onSelectPokemon}
            />
          ))}
        </Group>
      )}
      {second.length > 0 && (
        <Group title="Golpes Z por tipo" note="Qualquer Pokémon com o cristal do tipo: o golpe de dano daquele tipo vira o golpe Z.">
          {second.map((move) => (
            <SpecialMoveCard
              key={move.name}
              name={move.name}
              type={move.type}
              facts={[['Cristal Z', move.crystal], ['Poder', BY_BASE_POWER]]}
            />
          ))}
        </Group>
      )}
    </div>
  );
}

export default memo(SpecialMoves);
