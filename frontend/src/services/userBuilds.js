import { supabase } from './supabase';

const BUILDS = 'user_builds';
// Só o que a lista mostra; `updated_at` e `user_id` ficam no banco.
const BUILD_COLUMNS = 'id, name, pokemon_name, build, created_at';
export const BUILDS_PAGE = 50;

// RLS: cada conta só vê e muda as próprias builds; todo insert leva o user_id da sessão.

/** O gatilho do banco recusa a 201ª build com "limite de 200 builds atingido". */
export const isBuildLimitError = (error) => /limite de 200/i.test(error?.message ?? '');

// Dentro do or() do PostgREST, vírgula, parênteses e aspas separam filtros; * é o curinga do ilike.
const searchTerm = (text) => text.replace(/[,()"*%\\]/g, ' ').trim();

/**
 * Uma página das builds, das mais novas para as mais antigas. `query` procura no nome e no Pokémon;
 * `species` filtra por um Pokémon exato. Devolve { rows, hasMore }.
 */
export async function fetchBuilds(userId, { offset = 0, query = '', species = '' } = {}) {
  let request = supabase
    .from(BUILDS)
    .select(BUILD_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    // Uma a mais que a página: se ela vier, há o que carregar depois.
    .range(offset, offset + BUILDS_PAGE);
  const term = searchTerm(query);
  if (term) request = request.or(`name.ilike.*${term}*,pokemon_name.ilike.*${term}*`);
  if (species) request = request.eq('pokemon_name', species);
  const { data, error } = await request;
  if (error) throw error;
  const rows = data ?? [];
  return { rows: rows.slice(0, BUILDS_PAGE), hasMore: rows.length > BUILDS_PAGE };
}

/** Os Pokémon que têm build, para o filtro (no máximo 200 linhas, só uma coluna). */
export async function fetchBuildSpecies(userId) {
  const { data, error } = await supabase.from(BUILDS).select('pokemon_name').eq('user_id', userId);
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.pokemon_name))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function insertBuild(userId, name, build) {
  const { data, error } = await supabase
    .from(BUILDS)
    .insert({ user_id: userId, name, pokemon_name: build.species, build })
    .select(BUILD_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function renameBuild(id, name) {
  const { error } = await supabase.from(BUILDS).update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteBuild(id) {
  const { error } = await supabase.from(BUILDS).delete().eq('id', id);
  if (error) throw error;
}
