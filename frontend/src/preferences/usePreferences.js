import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPreferencesStore } from './preferences';
import { fetchUserPreferences, saveUserPreferences } from '../services/userSettings';

let saveErrorHandler = null;

// Um estado só para a página: as preferências mexem no <html> (animações, tamanho da fonte).
export const preferencesStore = createPreferencesStore({
  api: { fetch: fetchUserPreferences, save: saveUserPreferences },
  root: typeof document === 'undefined' ? null : document.documentElement,
  onSaveError: (error) => {
    console.warn('Preferência não salva:', error);
    saveErrorHandler?.(error);
  },
});

/** Liga as preferências à sessão. Chamado uma vez, no App, depois que a sessão inicial é conhecida. */
export function usePreferencesSession(userId, authReady, onSaveError) {
  useEffect(() => {
    saveErrorHandler = onSaveError;
    return () => { saveErrorHandler = null; };
  }, [onSaveError]);

  useEffect(() => {
    if (authReady) preferencesStore.restore(userId ?? null);
  }, [userId, authReady]);
}

/** { userId, status, values }: `values` sempre tem todas as chaves (padrões do site para visitante). */
export function usePreferences() {
  return useSyncExternalStore(preferencesStore.subscribe, preferencesStore.getState);
}

export const savePreferences = (patch) => preferencesStore.save(patch);

const SAVED_MS = 2500;

/** [status, salvar]: status é null, 'saving', 'saved' (some depois de alguns segundos) ou 'error'. */
export function usePreferenceSaver() {
  const [status, setStatus] = useState(null);
  const timer = useRef(0);
  const last = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const save = useCallback(async (patch) => {
    const id = ++last.current;
    clearTimeout(timer.current);
    setStatus('saving');
    const ok = await preferencesStore.save(patch);
    if (id !== last.current) return ok;
    setStatus(ok ? 'saved' : 'error');
    if (ok) timer.current = setTimeout(() => setStatus(null), SAVED_MS);
    return ok;
  }, []);

  return [status, save];
}
