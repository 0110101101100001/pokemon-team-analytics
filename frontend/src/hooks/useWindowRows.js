import { useLayoutEffect, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Virtualizer, observeWindowOffset, observeWindowRect, windowScroll } from '@tanstack/react-virtual';

// As correções da lib vêm sem `behavior`; com o scroll-behavior: smooth do CSS, sairiam animadas.
const instantWindowScroll = (offset, options, instance) =>
  windowScroll(offset, { ...options, behavior: options.behavior ?? 'instant' }, instance);

// O que a grade desenha: quais linhas, onde começam e a altura total. O deslocamento da rolagem não entra.
function renderKey(instance) {
  const items = instance.getVirtualItems();
  return `${items[0]?.key}|${items.length}|${items[0]?.start}|${instance.getTotalSize()}`;
}

/**
 * O `useWindowVirtualizer` do @tanstack/react-virtual, mas só re-renderiza quando muda o conjunto de linhas
 * ou a medida delas. O original re-renderiza (com flushSync) a cada evento de rolagem, o que pesa no
 * celular com a CPU lenta: as linhas ficam em posição absoluta e não dependem do deslocamento.
 */
export function useWindowRows(options) {
  const [, rerender] = useReducer((count) => count + 1, 0);
  const lastKey = useRef('');
  const resolved = {
    getScrollElement: () => (typeof document !== 'undefined' ? window : null),
    observeElementRect: observeWindowRect,
    observeElementOffset: observeWindowOffset,
    scrollToFn: instantWindowScroll,
    initialOffset: () => (typeof document !== 'undefined' ? window.scrollY : 0),
    ...options,
    onChange: (instance, sync) => {
      options.onChange?.(instance);
      const key = renderKey(instance);
      if (key === lastKey.current) return;
      lastKey.current = key;
      if (sync) flushSync(rerender);
      else rerender();
    },
  };

  const [instance] = useState(() => new Virtualizer(resolved));
  instance.setOptions(resolved);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- montagem única, como no hook da lib
  useLayoutEffect(() => instance._didMount(), []);
  useLayoutEffect(() => instance._willUpdate());
  return instance;
}
