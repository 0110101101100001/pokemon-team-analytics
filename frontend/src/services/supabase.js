import { AuthClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos no .env');
}

// O site só usa login e tabelas. O cliente completo (`@supabase/supabase-js`) traria também storage, realtime e
// functions para o pacote inicial; aqui ficam só as duas peças, montadas como o createClient monta.
const baseUrl = new URL(url);

const auth = new AuthClient({
  url: new URL('auth/v1', baseUrl).href,
  headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
  // Mesma chave do createClient: quem já estava logado continua logado.
  storageKey: `sb-${baseUrl.hostname.split('.')[0]}-auth-token`,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
});

// Cada consulta vai com o token da sessão (para as políticas de RLS do usuário) ou, sem login, com a chave anônima.
async function fetchWithSession(input, init) {
  const { data } = await auth.getSession();
  const headers = new Headers(init?.headers);
  if (!headers.has('apikey')) headers.set('apikey', anonKey);
  if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${data.session?.access_token ?? anonKey}`);
  return fetch(input, { ...init, headers });
}

const rest = new PostgrestClient(new URL('rest/v1', baseUrl).href, { fetch: fetchWithSession });

export const supabase = {
  auth,
  from: (table) => rest.from(table),
};
