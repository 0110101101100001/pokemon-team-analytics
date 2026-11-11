// Um só IntersectionObserver para toda a página. Marca a entrada diretamente no DOM
// (atributo data-inview) e deixa de observar, sem re-renderizar o componente.
let observer = null;

export function observeInView(el) {
  if (!el) return () => {};
  if (typeof IntersectionObserver === 'undefined') {
    el.dataset.inview = '';
    return () => {};
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.dataset.inview = '';
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.12 },
  );
  observer.observe(el);
  return () => observer.unobserve(el);
}

export const REVEAL_CLASS =
  'opacity-0 translate-y-4 transition-[opacity,transform] duration-700 ease-out data-[inview]:opacity-100 data-[inview]:translate-y-0 motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none';
