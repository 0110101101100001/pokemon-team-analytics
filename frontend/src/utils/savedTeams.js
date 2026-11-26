import { normalizeBattleSet } from './stats';
import { TEAM_SIZE } from './teamScore';

export const SAVED_TEAM_NAME_MAX = 40;

// `set` (item, natureza, EVs, IVs, golpes) é salvo junto de cada Pokémon; times antigos não o têm.
export const toStoredPokemon = ({ id, name, number, species, types, set }) => ({ id, name, number, species, types, ...(set && { set }) });

/** Time do builder → coluna `pokemons` (no máximo 6). */
export const toStoredTeam = (team) => team.slice(0, TEAM_SIZE).map(toStoredPokemon);

/** Mensagem de erro de salvar ou apagar um time, para a pessoa ler. */
export const describeSavedTeamError = (error) =>
  error?.code === '42501' || error?.code === 'PGRST301'
    ? 'Sessão expirada ou sem permissão. Entre novamente.'
    : error?.message ?? 'Algo deu errado. Tente novamente.';

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
