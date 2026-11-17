import { memo, useState } from 'react';
import { Package } from 'lucide-react';
import ShowMoreButton from '../ShowMoreButton';
import { useIncrementalList } from '../../hooks/useIncrementalList';
import { itemSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';

const BATCH_SIZE = 60;

const ItemCard = memo(function ItemCard({ item, onSelect }) {
  const [spriteFailed, setSpriteFailed] = useState(false);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.name)}
        className="paper-card flex h-full w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-[box-shadow,transform] duration-150 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#4A463E] motion-reduce:transform-none"
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
          <span className="block truncate font-reading text-[15px] font-semibold text-ink">{formatSlug(item.name)}</span>
          <span className="block truncate font-reading text-xs text-ink-soft">{formatSlug(item.category)}</span>
        </span>
      </button>
    </li>
  );
});

/** Grade de itens em lotes: os próximos cards só são montados quando o fim da lista se aproxima. */
function ItemGrid({ items, onSelect }) {
  const batch = useIncrementalList(items, BATCH_SIZE);

  if (items.length === 0) {
    return (
      <p className="py-16 text-center font-reading text-sm italic text-smeargle-textDim/80">
        Nenhum item encontrado. Ajuste a busca ou os filtros.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {batch.visible.map((item) => <ItemCard key={item.name} item={item} onSelect={onSelect} />)}
      </ul>
      <ShowMoreButton list={batch} className="mt-8" />
    </>
  );
}

export default memo(ItemGrid);
