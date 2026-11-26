import { useEffect, useSyncExternalStore } from 'react';

// Altura do header fixo, que muda quando ele recolhe ao rolar ou quando a seção desenha filtros nele.
// Fica numa variável CSS (--app-header-h, para o que gruda logo abaixo dele) e num estado lido pelo JS
// (a margem dos saltos da grade, para o card de destino não parar debaixo do header).
const FALLBACK = 160;
let height = FALLBACK;
const listeners = new Set();

function publish(next) {
  const rounded = Math.round(next);
  if (rounded === height) return;
  height = rounded;
  document.documentElement.style.setProperty('--app-header-h', `${rounded}px`);
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getHeaderHeight = () => height;
export const useHeaderHeight = () => useSyncExternalStore(subscribe, getHeaderHeight, () => FALLBACK);

/** Mede o header (ResizeObserver: sem trabalho na rolagem) e publica a altura. */
export function useMeasureHeader(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    publish(node.getBoundingClientRect().height);
    const observer = new ResizeObserver(([entry]) => publish(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height));
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
}
