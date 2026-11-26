import { PostgrestClient } from '@supabase/postgrest-js';
import { createAuthStorage, isRecoveryHash } from './authStorage';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos no .env');
}

// O site só usa login e tabelas. O cliente completo (`@supabase/supabase-js`) traria também storage, realtime e
// functions para o pacote inicial; aqui ficam só as duas peças, montadas como o createClient monta.
const baseUrl = new URL(url);
// Mesma chave do createClient: quem já estava logado continua logado.
const STORAGE_KEY = `sb-${baseUrl.hostname.split('.')[0]}-auth-token`;

const browserStorage = (name) => {
  try {
    return window[name];
  } catch {
    return null;
  }
};
// "Lembre-se de mim": a sessão vai para o localStorage ou para o sessionStorage (services/authStorage.js).
const authStorage = createAuthStorage({ local: browserStorage('localStorage'), session: browserStorage('sessionStorage') });
// Lido antes de o auth-js limpar o endereço: a visita veio do link de "Esqueci minha senha".
// (Fora do navegador, nos testes, não há endereço.)
let recoveryLink = typeof window !== 'undefined' && isRecoveryHash(window.location.hash);

/*
  O cliente de login (@supabase/auth-js) é a maior peça do pacote, e a maioria das visitas é de quem não entrou.
  Ele só é baixado quando há o que fazer: uma sessão salva neste navegador, o retorno de um link de confirmação
  (#access_token na URL) ou um pedido de login, cadastro ou saída. Sem isso, a sessão é nula e as consultas vão
  com a chave anônima, como já iam.
*/
let client = null;
// Inscrições feitas antes do cliente existir: entram quando ele for baixado.
const waitingForClient = new Set();

function loadClient() {
  client ??= import('@supabase/auth-js')
    .then(({ AuthClient }) => new AuthClient({
      url: new URL('auth/v1', baseUrl).href,
      headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
      storageKey: STORAGE_KEY,
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    }))
    .then((created) => {
      queueMicrotask(() => waitingForClient.forEach((subscribe) => subscribe()));
      return created;
    })
    .catch((error) => {
      client = null;
      throw error;
    });
  return client;
}

function needsClient() {
  if (client) return true;
  if (authStorage.getItem(STORAGE_KEY)) return true;
  return /[#&](access_token|error_description)=/.test(window.location.hash);
}

const NO_SESSION = { data: { session: null }, error: null };

const auth = {
  /** Baixa o cliente antes da hora (o modal de login chama ao abrir), para o envio não esperar o download. */
  preload: () => loadClient().catch(() => {}),

  async getSession() {
    if (!needsClient()) return NO_SESSION;
    return (await loadClient()).getSession();
  },

  /** Entrar; `remember` = false guarda a sessão só até fechar o navegador. */
  async signInWithPassword(credentials, { remember = true } = {}) {
    authStorage.setRemember(remember);
    return (await loadClient()).signInWithPassword(credentials);
  },
  getRemember: () => authStorage.getRemember(),
  /** "Esqueci minha senha": o Supabase manda um link que volta ao site com uma sessão de recuperação. */
  resetPasswordForEmail: async (email) => (await loadClient()).resetPasswordForEmail(email, { redirectTo: window.location.origin }),
  /** true uma vez, se a página abriu pelo link de recuperação (o modal então pede a senha nova). */
  consumeRecoveryLink() {
    const was = recoveryLink;
    recoveryLink = false;
    return was;
  },
  // Conta nova (e o link de confirmação que volta logado) fica lembrada, como era antes da opção existir.
  async signUp(credentials) {
    authStorage.setRemember(true);
    return (await loadClient()).signUp(credentials);
  },
  // Trocar e-mail ou senha (Configurações → Segurança). Só existe com sessão, então o cliente já está carregado.
  updateUser: async (attributes, options) => (await loadClient()).updateUser(attributes, options),
  // Envia por e-mail o código que a troca de senha pede quando o login é antigo ("Secure password change").
  reauthenticate: async () => (await loadClient()).reauthenticate(),

  async signOut() {
    if (!needsClient()) return { error: null };
    return (await loadClient()).signOut();
  },

  /**
   * Mesmo contrato do auth-js. Sem cliente, avisa logo INITIAL_SESSION sem sessão e se inscreve no cliente quando
   * ele for baixado (no login), ignorando o INITIAL_SESSION repetido que o auth-js manda a cada inscrição nova.
   */
  onAuthStateChange(callback) {
    let active = true;
    let subscription = null;
    const deferred = !needsClient();
    if (deferred) queueMicrotask(() => active && callback('INITIAL_SESSION', null));

    const subscribe = () => loadClient().then((authClient) => {
      if (!active) return;
      ({ subscription } = authClient.onAuthStateChange((event, session) => {
        if (deferred && event === 'INITIAL_SESSION') return;
        callback(event, session);
      }).data);
    }).catch(() => {
      // Sem o cliente (rede caiu): continua sem sessão; a próxima tentativa de login baixa de novo.
      if (!deferred && active) callback('INITIAL_SESSION', null);
    });

    const subscribeOnce = () => {
      waitingForClient.delete(subscribeOnce);
      subscribe();
    };
    // Sem cliente, a inscrição espera outra parte do site baixá-lo (login, cadastro).
    if (deferred) waitingForClient.add(subscribeOnce);
    else subscribe();

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            active = false;
            waitingForClient.delete(subscribeOnce);
            subscription?.unsubscribe();
          },
        },
      },
    };
  },
};

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
