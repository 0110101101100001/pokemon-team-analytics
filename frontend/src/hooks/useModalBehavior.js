import { useEffect, useRef } from 'react';

/**
 * Comportamento comum dos modais enquanto montados: Esc fecha, a página não rola,
 * o foco vai para `initialFocusRef` e volta ao elemento de origem ao fechar.
 */
export function useModalBehavior(onClose, initialFocusRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    initialFocusRef?.current?.focus();

    const handleKey = (e) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', handleKey);

    const { style } = document.body;
    const previous = { overflow: style.overflow, paddingRight: style.paddingRight };
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    style.overflow = 'hidden';
    // Compensa a barra de rolagem que some, para a página não deslocar para o lado.
    if (scrollbarWidth > 0) style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      window.removeEventListener('keydown', handleKey);
      style.overflow = previous.overflow;
      style.paddingRight = previous.paddingRight;
      previousFocus?.focus?.();
    };
  }, [initialFocusRef]);
}
