import { supabase } from './supabase';

const FAVORITES = 'user_favorites';
const HISTORY = 'user_history';
const UNIQUE_VIOLATION = '23505';

export const HISTORY_LIMIT = 60;

// As políticas das duas tabelas exigem auth.uid() = user_id, por isso todo insert leva o id do usuário logado.

/** Nomes dos Pokémon favoritos, do mais recente para o mais antigo. */
export async function fetchFavorites(userId) {
  const { data, error } = await supabase
    .from(FAVORITES)
    .select('pokemon_name')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => row.pokemon_name);
}

export async function addFavorite(userId, pokemonName) {
  const { error } = await supabase.from(FAVORITES).insert({ user_id: userId, pokemon_name: pokemonName });
  // (user_id, pokemon_name) é único: já estar favoritado conta como sucesso.
  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}

export async function removeFavorite(userId, pokemonName) {
  const { error } = await supabase.from(FAVORITES).delete().eq('user_id', userId).eq('pokemon_name', pokemonName);
  if (error) throw error;
}

/** Visitas mais recentes, uma por Pokémon: [{ name, viewedAt }]. */
export async function fetchHistory(userId) {
  const { data, error } = await supabase
    .from(HISTORY)
    .select('pokemon_name, viewed_at')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;

  const seen = new Set();
  return data
    .filter((row) => !seen.has(row.pokemon_name) && seen.add(row.pokemon_name))
    .map((row) => ({ name: row.pokemon_name, viewedAt: row.viewed_at }));
}

/**
 * Registra a visita a uma ficha. A tabela não tem política de UPDATE, então a visita anterior
 * ao mesmo Pokémon é apagada antes: fica uma linha por Pokémon, com a data mais recente.
 */
export async function recordView(userId, pokemonName) {
  const previous = await supabase.from(HISTORY).delete().eq('user_id', userId).eq('pokemon_name', pokemonName);
  if (previous.error) throw previous.error;
  const { error } = await supabase.from(HISTORY).insert({ user_id: userId, pokemon_name: pokemonName });
  if (error) throw error;
}

export async function clearHistory(userId) {
  const { error } = await supabase.from(HISTORY).delete().eq('user_id', userId);
  if (error) throw error;
}
