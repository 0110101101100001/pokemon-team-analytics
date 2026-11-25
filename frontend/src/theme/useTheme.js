import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { createThemeController } from './themeController';
import { fetchUserTheme, saveUserTheme } from '../services/userSettings';

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// A barra do navegador no celular acompanha o header: a cor vem do token já aplicado, sem repetir a paleta aqui.
function updateThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  const header = getComputedStyle(document.documentElement).getPropertyValue('--header').trim();
  if (meta && header) meta.setAttribute('content', header);
}

let saveErrorHandler = null;

// Um controlador só para a página: o atributo data-theme do <html> é um estado global.
export const themeController = createThemeController({
  storage: browserStorage(),
  root: document.documentElement,
  api: { fetch: fetchUserTheme, save: saveUserTheme },
  onApply: updateThemeColor,
  onSaveError: (error) => {
    console.warn('Tema não salvo:', error);
    saveErrorHandler?.();
  },
});

/**
 * O tema da página. `authReady` diz que a sessão inicial já é conhecida: antes disso nada muda, para quem tem
 * conta não ver o padrão piscar. Devolve [tema, escolher]; escolher só funciona com conta.
 */
export function useTheme(userId, authReady, onSaveError) {
  const theme = useSyncExternalStore(themeController.subscribe, themeController.getTheme);
  const onSaveErrorRef = useRef(onSaveError);
  onSaveErrorRef.current = onSaveError;

  useEffect(() => {
    saveErrorHandler = () => onSaveErrorRef.current?.();
    return () => { saveErrorHandler = null; };
  }, []);

  useEffect(() => {
    if (authReady) themeController.restore(userId ?? null);
  }, [userId, authReady]);

  const choose = useCallback((next) => themeController.choose(next), []);
  return [theme, choose];
}
