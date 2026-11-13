import { useSyncExternalStore } from 'react';

const subscribe = (onChange) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

const readPath = () => window.location.hash.replace(/^#\/?/, '').split('/')[0];

/**
 * Primeiro segmento do hash (`#/itens` → "itens"). Guardar a aba no hash faz o botão voltar
 * trocar de seção e mantém a aba ao recarregar, sem depender de rotas no servidor.
 */
export const useHashPath = () => useSyncExternalStore(subscribe, readPath);
