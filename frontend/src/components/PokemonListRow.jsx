import { memo } from 'react';
import { TypeStamp } from './PokemonTypeBadge';
import FavoriteButton from './FavoriteButton';
import CompareCardButton from './CompareCardButton';
import { SmogonSeal } from './PokemonCard';
import { thumbnailSpriteUrl } from '../services/api';
import { STAT_KEYS, STAT_LABELS, STAT_SHORT } from '../utils/pokedexView';

const MAX_STAT = 255;
export const LIST_ROW_HEIGHT = 56; // a linha (48) + o espaço até a próxima (8)

/** Total e seis mini-barras (HP a Velocidade). Sem os atributos ainda carregados, um traço no lugar. */
function StatSummary({ stats }) {
  if (!stats) return <span className="w-10 text-right font-mono text-xs text-ink-soft">—</span>;
  const detail = STAT_KEYS.map((key) => `${STAT_LABELS[key]} ${stats[key]}`).join(' · ');
  return (
    <span className="flex items-center gap-2.5" title={detail}>
      <span className="sr-only">{`Total ${stats.total}: ${detail}`}</span>
      <span aria-hidden="true" className="w-10 text-right font-mono text-sm font-bold tabular-nums text-ink">{stats.total}</span>
      <span aria-hidden="true" className="hidden items-end gap-[3px] lg:flex">
        {STAT_KEYS.map((key) => (
          <span key={key} className="flex flex-col items-center gap-0.5">
            <span className="flex h-5 w-2.5 items-end overflow-hidden rounded-[2px] bg-line/70">
              <span className="block w-full rounded-[2px] bg-accent" style={{ height: `${Math.max(8, (stats[key] / MAX_STAT) * 100)}%` }} />
            </span>
            <span className="font-mono text-[8px] leading-none text-ink-soft">{STAT_SHORT[key]}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * Linha da Pokédex em modo Lista: a linha inteira abre a ficha (botão esticado, como no card) e comparar e
 * favoritar ficam por cima, com áreas de toque de 40 × 40.
 */
function PokemonListRow({
  pokemon, id, number, types = [], index, stats, isSelected, hasSmogonData,
  isFavorite, isCompared, compareFull, onSelect, onToggleFavorite, onToggleCompare,
}) {
  const name = pokemon.replace(/-/g, ' ');
  return (
    <article
      data-selected={isSelected}
      data-card-index={index}
      className="print-card list-row grid h-12 select-none grid-cols-[3.25rem_2.5rem_minmax(0,1fr)_auto_auto] items-center gap-x-2 pl-2 pr-0.5 sm:grid-cols-[3.75rem_2.5rem_minmax(0,1fr)_auto_auto_auto] sm:gap-x-3"
    >
      <button
        type="button"
        onClick={() => onSelect(pokemon)}
        aria-pressed={isSelected}
        aria-label={`Abrir a ficha de ${name}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-[4px] focus:outline-none"
      />
      <span className="font-mono text-xs font-bold tabular-nums text-ink">{String(number).padStart(4, '0')}</span>
      <img
        src={thumbnailSpriteUrl(id ?? number)}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
        className="h-10 w-10 object-contain [image-rendering:pixelated]"
      />
      <h3 className="truncate font-serif text-base font-bold capitalize text-ink">{name}</h3>
      <span className="hidden items-center gap-1 sm:flex">
        {types.map((type) => <TypeStamp key={type} type={type} />)}
      </span>
      <StatSummary stats={stats} />
      <span className="relative z-20 flex items-center">
        {/* No celular a linha é estreita: o selo só aparece do sm em diante. */}
        {hasSmogonData && <span className="mr-1 hidden sm:inline-flex"><SmogonSeal /></span>}
        {onToggleCompare && (
          <CompareCardButton name={pokemon} label={name} active={isCompared} full={compareFull} onToggle={onToggleCompare} />
        )}
        {onToggleFavorite && (
          <FavoriteButton name={pokemon} label={name} active={isFavorite} onToggle={onToggleFavorite} />
        )}
      </span>
    </article>
  );
}

export default memo(PokemonListRow);
