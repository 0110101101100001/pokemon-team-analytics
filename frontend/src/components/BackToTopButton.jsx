import { memo } from 'react';
import { ArrowUp } from 'lucide-react';
import { useScrollCollapsed } from '../hooks/useScrollCollapsed';

/** Aparece depois de umas duas telas de rolagem, no canto inferior esquerdo, e leva de volta ao topo. */
function BackToTopButton() {
  const visible = useScrollCollapsed({ collapseAt: 1200, expandAt: 800 });

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      className={`back-to-top fixed bottom-4 left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-ink bg-umber text-paper transition-[opacity,transform,background-color] duration-200 ease-out hover:bg-sepia focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-page motion-reduce:transition-none sm:bottom-6 sm:left-6 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}

export default memo(BackToTopButton);
