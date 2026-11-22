import { supabase } from './supabase';
import { isProfilePokemonId } from '../utils/profilePokemon';

const PROFILES = 'user_profiles';

// As políticas da tabela exigem auth.uid() = user_id: toda leitura e escrita leva o id do usuário logado.

/** O Pokémon salvo no perfil, ou null se a conta ainda não tem linha. */
export async function fetchProfilePokemon(userId) {
  const { data, error } = await supabase.from(PROFILES).select('pokemon_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.pokemon_id ?? null;
}

/** Cria a linha da conta. Se outra gravação chegou antes, ela vale e esta não faz nada. */
export async function createProfile(userId, pokemonId) {
  const { error } = await supabase
    .from(PROFILES)
    .upsert({ user_id: userId, pokemon_id: pokemonId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function saveProfilePokemon(userId, pokemonId) {
  if (!isProfilePokemonId(pokemonId)) throw new RangeError(`Pokémon de perfil inválido: ${pokemonId}`);
  const { error } = await supabase
    .from(PROFILES)
    .upsert({ user_id: userId, pokemon_id: pokemonId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
