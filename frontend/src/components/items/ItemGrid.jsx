import { memo, useEffect, useRef, useState } from 'react';
import { Package } from 'lucide-react';
import { itemSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';

const BATCH_SIZE = 60;
const PRELOAD_MARGIN = '600px 0px';

const ItemCard = memo(function ItemCard({ item, onSelect }) {
  const [spriteFailed, setSpriteFailed] = useState(false);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.name)}
        className="paper-card flex h-full w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#829b72]/60 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt motion-reduce:transform-none"
      >
        <span className="ink-stamp h-11 w-11 shrink-0">
          {spriteFailed ? (
            <Package className="h-4 w-4 text-[#78614E]/60" aria-hidden="true" />
          ) : (
            <img
              src={itemSpriteUrl(item.name)}
              alt=""
              width={30}
              height={30}
              loading="lazy"
              decoding="async"
              onError={() => setSpriteFailed(true)}
              className="h-[30px] w-[30px] object-contain [image-rendering:pixelated]"
            />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-serif text-sm font-bold text-[#3E3A35]">{formatSlug(item.name)}</span>
          <span className="block truncate text-[11px] font-medium text-[#78614E]">{formatSlug(item.category)}</span>
        </span>
      </button>
    </li>
  );
});

/** Grade de itens em lotes: os próximos cards só são montados quando o fim da lista se aproxima. */
function ItemGrid({ items, onSelect }) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [renderedItems, setRenderedItems] = useState(items);
  const sentinelRef = useRef(null);

  if (renderedItems !== items) {
    setRenderedItems(items);
    setVisibleCount(BATCH_SIZE);
  }

  const shown = Math.min(visibleCount, items.length);
  const hasMore = shown < items.length;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!hasMore || !node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisibleCount((count) => count + BATCH_SIZE),
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, shown]);

  if (items.length === 0) {
    return (
      <p className="py-16 text-center font-serif text-sm italic text-smeargle-textDim/80">
        Nenhum item encontrado. Ajuste a busca ou os filtros.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {items.slice(0, shown).map((item) => <ItemCard key={item.name} item={item} onSelect={onSelect} />)}
      </ul>
      {hasMore && (
        <div className="mt-8 flex justify-center [overflow-anchor:none]">
          <button
            ref={sentinelRef}
            type="button"
            onClick={() => setVisibleCount((count) => count + BATCH_SIZE)}
            className="btn-outline font-serif"
          >
            Mostrar mais · {shown} de {items.length}
          </button>
        </div>
      )}
    </>
  );
}

export default memo(ItemGrid);
