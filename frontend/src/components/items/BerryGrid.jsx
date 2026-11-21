import { memo } from 'react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { itemSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { berryCategoryLabel, berryFlavors, firmnessLabel } from '../../utils/itemData';

const LABEL = 'block text-[10px] font-semibold uppercase text-[#78614E]';
// O sabor mais forte de qualquer Berry é 40.
const FLAVOR_MAX = 40;

function BerryCard({ berry, onSelect }) {
  const flavors = berryFlavors(berry);
  const name = formatSlug(berry.name);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(berry.name)}
        aria-label={`Ver o efeito de ${name}`}
        className="paper-card flex h-full w-full cursor-pointer flex-col gap-2.5 p-3.5 text-left transition-transform hover:-translate-x-px hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0"
      >
        <span className="flex items-center gap-2">
          <img src={itemSpriteUrl(berry.name)} alt="" width={30} height={30} loading="lazy" decoding="async" className="h-[30px] w-[30px] shrink-0 [image-rendering:pixelated]" />
          <span className="min-w-0">
            <span className="block truncate font-serif text-base font-black tracking-tight text-[#2A2421]">{name}</span>
            <span className="block truncate text-[11px] italic text-[#4A463E]">{berryCategoryLabel(berry.category)}</span>
          </span>
        </span>

        <span className="block">
          <span className={LABEL}>Sabor</span>
          {flavors.length > 0 ? (
            <span className="mt-1 block space-y-1">
              {flavors.map((flavor) => (
                <span key={flavor.key} className="flex items-center gap-2 text-[11px] font-semibold text-[#2A2421]">
                  <span className="w-14 shrink-0">{flavor.label}</span>
                  <span className="brush-bar-track !h-1.5 flex-1">
                    <span className="brush-bar block bg-[#829b72]" style={{ width: `${Math.min(flavor.value / FLAVOR_MAX, 1) * 100}%` }} />
                  </span>
                  <span className="w-5 text-right font-mono tabular-nums text-[#78614E]">{flavor.value}</span>
                </span>
              ))}
            </span>
          ) : (
            <span className="text-xs text-[#4A463E]">—</span>
          )}
        </span>

        <span className="mt-auto grid grid-cols-2 gap-2">
          <span className="block">
            <span className={LABEL}>Natural Gift</span>
            <span className="mt-0.5 flex items-center gap-1.5">
              {berry.naturalGift.type && <PokemonTypeBadge type={berry.naturalGift.type} className="!px-1.5 !text-[9px]" />}
              <span className="font-mono text-xs font-bold tabular-nums text-[#2A2421]">{berry.naturalGift.power}</span>
            </span>
          </span>
          <span className="block">
            <span className={LABEL}>Firmeza</span>
            <span className="text-xs font-bold text-[#2A2421]">{firmnessLabel(berry.firmness)}</span>
          </span>
          <span className="col-span-2 block">
            <span className={LABEL}>Crescimento</span>
            <span className="text-xs font-bold text-[#2A2421]">
              {berry.growthTime} h por estágio <span className="font-normal text-[#4A463E]">· até {berry.maxHarvest} por pé</span>
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

/** Grade das Berries: categoria, sabores, Natural Gift, firmeza e crescimento. O toque abre o efeito em batalha. */
function BerryGrid({ berries, onSelect }) {
  if (berries.length === 0) {
    return <p className="py-16 text-center font-hand text-2xl text-[#78614E]">nenhuma Berry com esses filtros</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {berries.map((berry) => <BerryCard key={berry.name} berry={berry} onSelect={onSelect} />)}
    </ul>
  );
}

export default memo(BerryGrid);
