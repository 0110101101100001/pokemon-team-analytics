import { DEX_SIZE } from './pokedex';

export const DEFAULT_PROFILE_POKEMON = 25;

// Estilo do ícone do perfil (coluna icon_style de user_profiles, com a mesma regra): arte oficial ou sprite 2D.
export const PROFILE_ICON_STYLES = [
  { value: 'official', label: 'Arte oficial' },
  { value: '2d', label: 'Sprite 2D' },
];
export const DEFAULT_PROFILE_ICON_STYLE = 'official';
export const isProfileIconStyle = (style) => PROFILE_ICON_STYLES.some((option) => option.value === style);

/** Número da Pokédex aceito pelo perfil (a tabela user_profiles tem a mesma regra). */
export const isProfilePokemonId = (id) => Number.isInteger(id) && id >= 1 && id <= DEX_SIZE;
