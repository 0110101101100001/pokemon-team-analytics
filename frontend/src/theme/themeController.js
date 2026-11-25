import { DEFAULT_THEME, isThemeId } from './themes';

export const THEME_STORAGE_KEY = 'smearglepedia-theme';
// A classe que liga a transição de cor fica no <html> só durante a troca (themes.css).
const SWITCH_CLASS = 'theme-switching';
const SWITCH_MS = 220;

/** O tema guardado neste navegador, ou o padrão se não houver, se for inválido ou se o armazenamento falhar. */
export function readStoredTheme(storage) {
  try {
    const saved = storage?.getItem(THEME_STORAGE_KEY);
    return isThemeId(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function writeStoredTheme(storage, theme) {
  try {
    if (theme) storage?.setItem(THEME_STORAGE_KEY, theme);
    else storage?.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Sem armazenamento, o tema vale só até recarregar.
  }
}

/**
 * Estado do tema, sem React: aplica o atributo no <html>, espelha no localStorage e salva na conta.
 * - Visitante (ou sessão encerrada): sempre o padrão, e a chave local é apagada.
 * - Conta: o tema de user_settings; sem linha, o padrão, sem gravar nada.
 * - Escolha: aplica na hora, guarda e faz o upsert; se o upsert falhar, volta ao último tema confirmado.
 * `api` = { fetch(userId), save(userId, theme) }; `root` é o <html> (dataset e classList); `onApply` recebe o id.
 */
export function createThemeController({ storage, root, api, onApply, onSaveError, schedule = setTimeout }) {
  let theme = readStoredTheme(storage);
  let userId = null;
  let confirmed = DEFAULT_THEME; // o último tema que o banco tem para a conta (ou o padrão, sem linha)
  let hasRow = false;
  let account = 0; // muda a cada troca de conta: respostas atrasadas da conta anterior são ignoradas
  let choice = 0; // muda a cada escolha: só a última escolha que falhar reverte
  let switchTimer = 0;
  const listeners = new Set();

  function apply(next, animate) {
    if (animate && root.classList) {
      root.classList.add(SWITCH_CLASS);
      clearTimeout(switchTimer);
      switchTimer = schedule(() => root.classList.remove(SWITCH_CLASS), SWITCH_MS);
    }
    root.dataset.theme = next;
    onApply?.(next);
    if (next === theme) return;
    theme = next;
    listeners.forEach((listener) => listener());
  }

  return {
    getTheme: () => theme,
    getUserId: () => userId,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Chamado quando a sessão é conhecida (inclusive a inicial): `null` = visitante ou logout. */
    async restore(nextUserId) {
      const mine = ++account;
      choice += 1;
      userId = nextUserId ?? null;
      hasRow = false;
      confirmed = DEFAULT_THEME;
      if (!userId) {
        writeStoredTheme(storage, null);
        apply(DEFAULT_THEME, false);
        return;
      }
      try {
        const saved = await api.fetch(userId);
        if (mine !== account) return;
        if (isThemeId(saved)) {
          hasRow = true;
          confirmed = saved;
          writeStoredTheme(storage, saved);
          apply(saved, false);
        } else {
          writeStoredTheme(storage, null);
          apply(DEFAULT_THEME, false);
        }
      } catch (error) {
        // Sem resposta do banco, fica o que este navegador já mostrava.
        if (mine === account) console.warn('Tema da conta indisponível:', error);
      }
    },

    /** Só para conta logada. Resolve true se o banco confirmou. */
    async choose(next) {
      if (!userId || !isThemeId(next)) return false;
      const mineAccount = account;
      const mine = ++choice;
      const owner = userId;
      apply(next, true);
      writeStoredTheme(storage, next);
      try {
        await api.save(owner, next);
        if (mineAccount === account) {
          hasRow = true;
          confirmed = next;
        }
        return true;
      } catch (error) {
        if (mineAccount !== account || mine !== choice) return false;
        apply(confirmed, true);
        writeStoredTheme(storage, hasRow ? confirmed : null);
        onSaveError?.(error);
        return false;
      }
    },
  };
}
