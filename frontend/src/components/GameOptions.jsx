import { OPTION_CLASS } from './layout/HeaderControls';

/** <option>s de jogos agrupados por geração, para um select do header. */
export default function GameOptions({ games }) {
  const generations = [...new Set(games.map((game) => game.generation))];
  return generations.map((generation) => (
    <optgroup key={generation} label={`Geração ${generation}`} className={OPTION_CLASS}>
      {games
        .filter((game) => game.generation === generation)
        .map((game) => <option key={game.id} value={game.id} className={OPTION_CLASS}>{game.label}</option>)}
    </optgroup>
  ));
}
