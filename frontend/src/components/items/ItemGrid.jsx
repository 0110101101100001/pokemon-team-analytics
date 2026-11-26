import { memo, useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import ShowMoreButton from '../ShowMoreButton';
import { useIncrementalList } from '../../hooks/useIncrementalList';
import { itemSpriteUrl } from '../../services/api';
import { fetchStaticJson } from '../../services/staticData';
import { formatSlug } from '../../utils/filters';
import EmptyState from '../EmptyState';

const BATCH_SIZE = 60;

function ItemSprite({ name, size }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Package className="h-4 w-4 text-umber/60" aria-hidden="true" />;
  return (
    <img
      src={itemSpriteUrl(name)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="object-contain [image-rendering:pixelated]"
    />
  );
}

const ItemCard = memo(function ItemCard({ item, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.name)}
        className="paper-card flex h-full w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-[box-shadow,transform] duration-150 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-panel motion-reduce:transform-none"
      >
        <span className="ink-stamp h-11 w-11 shrink-0">
          <ItemSprite name={item.name} size={30} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-reading text-[15px] font-semibold text-ink">{formatSlug(item.name)}</span>
          <span className="block truncate font-reading text-xs text-ink-soft">{formatSlug(item.category)}</span>
        </span>
      </button>
    </li>
  );
});

/**
 * Efeito de cada item ({ nome: texto }, public/data/item-effects.json, ~40 KB com gzip), baixado uma vez e só no modo
 * Lista. null até chegar (ou se falhar: a lista segue sem o efeito).
 */
function useItemEffects(needed) {
  const [effects, setEffects] = useState(null);
  useEffect(() => {
    if (!needed || effects) return undefined;
    let active = true;
    fetchStaticJson('item-effects.json')
      .then((data) => active && data && setEffects(data))
      .catch((error) => console.warn('Efeitos dos itens indisponíveis:', error));
    return () => { active = false; };
  }, [needed, effects]);
  return effects;
}

/**
 * Linha do modo Lista: sprite, nome e categoria e, ao lado (no celular, embaixo), o efeito em até duas linhas.
 * O texto vem da PokéAPI só em inglês, por isso o lang="en".
 */
const ItemRow = memo(function ItemRow({ item, effect, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.name)}
        className="paper-card grid w-full cursor-pointer grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2 text-left transition-shadow duration-150 ease-out hover:shadow-panel sm:grid-cols-[2rem_minmax(0,13rem)_minmax(0,1fr)] lg:grid-cols-[2rem_minmax(0,16rem)_minmax(0,1fr)]"
      >
        <span className="row-span-2 flex h-8 w-8 items-center justify-center sm:row-span-1">
          <ItemSprite name={item.name} size={30} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-reading text-[15px] font-semibold text-ink">{formatSlug(item.name)}</span>
          <span className="block truncate font-reading text-xs text-ink-soft">{formatSlug(item.category)}</span>
        </span>
        <span lang="en" className="line-clamp-2 font-reading text-[13px] leading-snug text-ink-soft sm:text-sm">
          {effect ?? (effect === undefined ? '' : '—')}
        </span>
      </button>
    </li>
  );
});

/**
 * Itens em Grade (cards) ou Lista (linhas), em lotes: os próximos só são montados quando o fim da lista se aproxima.
 */
function ItemGrid({ items, onSelect, view = 'grid' }) {
  const batch = useIncrementalList(items, BATCH_SIZE);
  const effects = useItemEffects(view === 'list');

  if (items.length === 0) {
    return <EmptyState title="nenhum item com esses filtros" hint="Ajuste a busca, o grupo ou a categoria." />;
  }

  return (
    <>
      {view === 'list' ? (
        <ul className="flex flex-col gap-1.5">
          {batch.visible.map((item) => <ItemRow key={item.name} item={item} effect={effects ? (effects[item.name] ?? null) : undefined} onSelect={onSelect} />)}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {batch.visible.map((item) => <ItemCard key={item.name} item={item} onSelect={onSelect} />)}
        </ul>
      )}
      <ShowMoreButton list={batch} className="mt-8" />
    </>
  );
}

export default memo(ItemGrid);
