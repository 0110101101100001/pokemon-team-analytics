import { DEX_SIZE } from './pokedex';

export const DEFAULT_PROFILE_POKEMON = 25;

/** Número da Pokédex aceito pelo perfil (a tabela user_profiles tem a mesma regra). */
export const isProfilePokemonId = (id) => Number.isInteger(id) && id >= 1 && id <= DEX_SIZE;
