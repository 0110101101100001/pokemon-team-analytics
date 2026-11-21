import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { navigateHash, parseHash } from '../navigation/hashRoute';

const subscribe = (onChange) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

const readHash = () => window.location.hash;
const readPath = () => parseHash(window.location.hash).segments[0] ?? '';

/**
 * Primeiro segmento do hash (`#/itens` → "itens"). Guardar a aba no hash faz o botão voltar
 * trocar de seção e mantém a aba ao recarregar, sem depender de rotas no servidor.
 */
export const useHashPath = () => useSyncExternalStore(subscribe, readPath);

/** Hash inteiro já separado em segmentos e parâmetros. */
export function useHashRoute() {
  const hash = useSyncExternalStore(subscribe, readHash);
  return useMemo(() => parseHash(hash), [hash]);
}

/**
 * Modal com endereço próprio. Aberto por clique, ganha uma entrada no histórico: o botão voltar fecha o modal e
 * fechar volta uma entrada. Aberto por link (sem entrada empilhada aqui), fechar troca o endereço sem sair do site.
 * `isOpen` diz se o modal está aberto: fechado pelo botão voltar do navegador, a entrada empilhada já foi consumida.
 */
export function useHashOverlay(isOpen) {
  const pushed = useRef(false);
  useEffect(() => {
    if (!isOpen) pushed.current = false;
  }, [isOpen]);
  const open = useCallback((hash, { replace = false } = {}) => {
    if (!replace) pushed.current = true;
    navigateHash(hash, { replace });
  }, []);
  const close = useCallback((fallbackHash) => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      navigateHash(fallbackHash, { replace: true });
    }
  }, []);
  return { open, close };
}
