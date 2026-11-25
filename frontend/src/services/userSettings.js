import { supabase } from './supabase';

const SETTINGS = 'user_settings';

// RLS: só a própria linha, e só para `authenticated`. A linha só existe depois do primeiro upsert.

/** O tema salvo na conta, ou null se a conta nunca trocou de tema. */
export async function fetchUserTheme(userId) {
  const { data, error } = await supabase.from(SETTINGS).select('theme').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.theme ?? null;
}

export async function saveUserTheme(userId, theme) {
  const { error } = await supabase.from(SETTINGS).upsert({ user_id: userId, theme }, { onConflict: 'user_id' });
  if (error) throw error;
}
