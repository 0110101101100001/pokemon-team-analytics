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

// Colunas de preferência (migração user_settings_preferences); o tema fica com as funções acima.
export const PREFERENCE_COLUMNS = [
  'display_name', 'default_format', 'default_league_game', 'default_level', 'sprite_style', 'shiny_sprites',
  'home_section', 'reduce_motion', 'font_scale',
];

/** As preferências salvas, ou null se a conta ainda não tem linha. */
export async function fetchUserPreferences(userId) {
  const { data, error } = await supabase.from(SETTINGS).select(PREFERENCE_COLUMNS.join(', ')).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Grava só as colunas de `patch`; as outras ficam como estão (ou no padrão, se a linha for nova). */
export async function saveUserPreferences(userId, patch) {
  const { error } = await supabase.from(SETTINGS).upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
  if (error) throw error;
}

/** Tudo o que a conta guarda no site, para o "Exportar meus dados". */
export async function exportUserData(userId) {
  const tables = {
    perfil: supabase.from('user_profiles').select('pokemon_id, created_at, updated_at').eq('user_id', userId).maybeSingle(),
    configuracoes: supabase.from(SETTINGS).select(`theme, ${PREFERENCE_COLUMNS.join(', ')}, created_at, updated_at`).eq('user_id', userId).maybeSingle(),
    times: supabase.from('teams').select('name, pokemons, created_at').eq('user_id', userId).order('created_at'),
    builds: supabase.from('user_builds').select('name, pokemon_name, build, created_at, updated_at').eq('user_id', userId).order('created_at'),
    favoritos: supabase.from('user_favorites').select('pokemon_name, created_at').eq('user_id', userId).order('created_at'),
    historico: supabase.from('user_history').select('pokemon_name, viewed_at').eq('user_id', userId).order('viewed_at'),
  };
  const entries = await Promise.all(Object.entries(tables).map(async ([key, query]) => {
    const { data, error } = await query;
    if (error) throw error;
    return [key, data];
  }));
  return Object.fromEntries(entries);
}
