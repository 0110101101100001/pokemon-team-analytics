import { supabase } from './supabase';
import { isProfileIconStyle, isProfilePokemonId } from '../utils/profilePokemon';

const PROFILES = 'user_profiles';

// As políticas da tabela exigem auth.uid() = user_id: toda leitura e escrita leva o id do usuário logado.

/** O perfil salvo ({ pokemonId, iconStyle }), ou null se a conta ainda não tem linha. */
export async function fetchProfile(userId) {
  const { data, error } = await supabase.from(PROFILES).select('pokemon_id, icon_style').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? { pokemonId: data.pokemon_id, iconStyle: data.icon_style } : null;
}

/** Cria a linha da conta. Se outra gravação chegou antes, ela vale e esta não faz nada. */
export async function createProfile(userId, pokemonId) {
  const { error } = await supabase
    .from(PROFILES)
    .upsert({ user_id: userId, pokemon_id: pokemonId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
}

/** Grava o Pokémon e o estilo do ícone do perfil. */
export async function saveProfile(userId, { pokemonId, iconStyle }) {
  if (!isProfilePokemonId(pokemonId)) throw new RangeError(`Pokémon de perfil inválido: ${pokemonId}`);
  if (!isProfileIconStyle(iconStyle)) throw new RangeError(`Estilo de ícone inválido: ${iconStyle}`);
  const { error } = await supabase
    .from(PROFILES)
    .upsert(
      { user_id: userId, pokemon_id: pokemonId, icon_style: iconStyle, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}
