/*
  Onde a sessão do login fica guardada, conforme o "Lembre-se de mim":
  - marcado (padrão): localStorage, como sempre foi. A sessão continua depois de fechar o navegador.
  - desmarcado: sessionStorage. Vale só nesta aba e some ao fechar o navegador (ou a aba).
  A escolha em si fica no localStorage, para o checkbox abrir como da última vez. Qualquer gravação apaga a
  cópia do outro armazenamento, então nunca sobram duas sessões.
*/

export const REMEMBER_KEY = 'smearglepedia:lembrar-login';

const safe = (action, fallback = null) => {
  try {
    return action();
  } catch {
    // Armazenamento bloqueado (aba anônima, política do navegador): segue sem guardar.
    return fallback;
  }
};

/** `local` e `session` são Storage (ou objetos com a mesma interface); qualquer um pode faltar. */
export function createAuthStorage({ local, session }) {
  const remember = () => safe(() => local?.getItem(REMEMBER_KEY), null) !== '0';

  return {
    /** Chamar antes de entrar: decide onde a sessão nova será gravada. */
    setRemember(value) {
      safe(() => local?.setItem(REMEMBER_KEY, value ? '1' : '0'));
    },
    getRemember: remember,

    // Interface que o auth-js espera (SupportedStorage).
    getItem(key) {
      return safe(() => session?.getItem(key), null) ?? safe(() => local?.getItem(key), null);
    },
    setItem(key, value) {
      const [target, other] = remember() ? [local, session] : [session, local];
      safe(() => target?.setItem(key, value));
      safe(() => other?.removeItem(key));
    },
    removeItem(key) {
      safe(() => local?.removeItem(key));
      safe(() => session?.removeItem(key));
    },
  };
}

/** O link do e-mail de "Esqueci minha senha" volta com `type=recovery` no hash. */
export const isRecoveryHash = (hash) => /[#&]type=recovery(&|$)/.test(hash ?? '');
