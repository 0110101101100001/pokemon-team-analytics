import { normalizeBattleSet } from './stats';
import { TEAM_SIZE } from './teamScore';

/**
 * Time salvo (coluna `pokemons` de teams) → time do Team Builder: cada Pokémon volta a ser a entrada da grade
 * (tipos e formas atuais), com o set salvo normalizado; times antigos, sem set, ganham um vazio.
 */
export function fromStoredTeam(stored, pool) {
  const byId = new Map(pool.map((pokemon) => [pokemon.id, pokemon]));
  return stored.slice(0, TEAM_SIZE).map((pokemon) => ({
    ...(byId.get(pokemon.id) ?? pokemon),
    set: normalizeBattleSet(pokemon.set),
  }));
}
