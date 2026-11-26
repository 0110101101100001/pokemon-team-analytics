import { createContext, useContext } from 'react';

/**
 * Ações do App que os botões espalhados pelo site precisam sem passar props por cinco níveis:
 * a sessão, abrir o login, mostrar um aviso e abrir uma build na calculadora.
 */
export const AppActionsContext = createContext({
  session: null,
  openLogin: () => {},
  notify: () => {},
  openBuildInCalculator: () => {},
});

export const useAppActions = () => useContext(AppActionsContext);
