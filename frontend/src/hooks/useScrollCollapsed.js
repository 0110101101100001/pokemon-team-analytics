import { useEffect, useState } from 'react';

/**
 * `true` depois de o scroll passar `collapseAt`; volta a `false` abaixo de `expandAt`.
 * A histerese evita oscilação junto ao limiar; o estado só muda ao cruzar os limiares,
 * por isso o componente não re-renderiza a cada evento de scroll.
 */
export function useScrollCollapsed({ collapseAt = 96, expandAt = 32 } = {}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setCollapsed((current) => (current ? y > expandAt : y > collapseAt));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [collapseAt, expandAt]);

  return collapsed;
}
