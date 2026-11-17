/**
 * Sentinela de uma lista em lotes (useIncrementalList). Também é um botão: serve ao teclado e a navegadores
 * sem IntersectionObserver. overflow-anchor: none impede a rolagem de acompanhar o botão a cada lote inserido acima,
 * o que carregaria a lista inteira de uma vez.
 */
export default function ShowMoreButton({ list, className = 'mt-6' }) {
  if (!list.hasMore) return null;
  return (
    <div className={`flex justify-center [overflow-anchor:none] ${className}`}>
      <button ref={list.sentinelRef} type="button" onClick={list.showMore} className="btn-outline">
        Mostrar mais · <span className="font-mono text-xs tabular-nums">{list.shown} de {list.total}</span>
      </button>
    </div>
  );
}
