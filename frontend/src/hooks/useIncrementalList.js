import { useEffect, useRef, useState } from 'react';

// O próximo lote começa a ser montado antes de o fim da lista chegar à tela.
const PRELOAD_MARGIN = '600px 0px';

/**
 * Monta uma lista longa em lotes: `shown` itens agora e mais um lote quando o sentinela (`sentinelRef`,
 * o botão "Mostrar mais") se aproxima da tela. Uma lista nova (busca, filtro) volta ao primeiro lote.
 * `rootRef` aponta o contêiner com rolagem própria, quando a lista rola dentro dele e não na página.
 */
export function useIncrementalList(list, batchSize, rootRef = null) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [renderedList, setRenderedList] = useState(list);
  const sentinelRef = useRef(null);

  if (renderedList !== list) {
    setRenderedList(list);
    setVisibleCount(batchSize);
  }

  const shown = Math.min(visibleCount, list.length);
  const hasMore = shown < list.length;

  // Um observer novo a cada lote: se o sentinela ainda estiver à vista, ele dispara de novo até encher a tela.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!hasMore || !node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisibleCount((count) => count + batchSize),
      { root: rootRef?.current ?? null, rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, shown, batchSize, rootRef]);

  const showMore = () => setVisibleCount((count) => count + batchSize);

  return { visible: list.slice(0, shown), shown, total: list.length, hasMore, sentinelRef, showMore };
}
