import { memo, useState } from 'react';
import { TypeStamp, TYPE_INK } from './PokemonTypeBadge';
import FavoriteButton from './FavoriteButton';
import CompareCardButton from './CompareCardButton';
import { thumbnailSpriteUrl } from '../services/api';

/** Selo dos Pokémon com estatísticas de uso na Smogon; a legenda fica no cabeçalho da Pokédex. */
export function SmogonSeal() {
  return <span className="type-stamp shrink-0 font-bold text-smogon">Smogon</span>;
}

// Mancha atrás do sprite: a tinta do tipo diluída no papel, numa cor sólida (sem gradiente). Uma por tipo.
const blotStyles = new Map();
function blotStyleFor(type) {
  let style = blotStyles.get(type);
  if (!style) {
    style = { backgroundColor: `color-mix(in srgb, ${(TYPE_INK[type] ?? TYPE_INK.normal).border} 30%, var(--surface))` };
    blotStyles.set(type, style);
  }
  return style;
}

// O React 18 não conhece fetchPriority: o atributo vai em minúsculas, como o HTML espera.
const PRIORITY_LOADING = { loading: 'eager', fetchpriority: 'high' };
const LAZY_LOADING = { loading: 'lazy' };

/**
 * Sprite da PokéAPI em 128px; se faltar (algumas formas não têm), um sinal de interrogação a tinta sobre a mancha.
 * `priority`: card visível na abertura, carregado sem esperar o lazy loading.
 */
function CardSprite({ src, priority }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span aria-hidden="true" className="font-serif text-5xl font-bold text-ink/45">?</span>;
  return (
    <img
      src={src}
      alt=""
      width={128}
      height={128}
      {...(priority ? PRIORITY_LOADING : LAZY_LOADING)}
      decoding="async"
      onError={() => setFailed(true)}
      className="h-32 w-32 object-contain [image-rendering:pixelated]"
    />
  );
}

const displayName = (name) => name.replace(/-/g, ' ');

function PokemonCard({
  pokemon,
  id,
  number,
  types = [],
  index,
  priority = false,
  isSelected,
  hasSmogonData = false,
  isFavorite = false,
  isCompared = false,
  compareFull = false,
  onSelect,
  onToggleFavorite,
  onToggleCompare,
}) {
  const name = displayName(pokemon);

  return (
    <article data-selected={isSelected} data-card-index={index} className="print-card select-none p-4">
      {/*
        O card inteiro abre a ficha por este botão, esticado sobre ele. Favorito e comparar ficam acima (z-20) como irmãos,
        e não dentro: controle interativo aninhado em outro é HTML inválido e confunde leitores de tela.
      */}
      <button
        type="button"
        onClick={() => onSelect(pokemon)}
        aria-pressed={isSelected}
        aria-label={`Abrir a ficha de ${name}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-[4px] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      />

      <div className="flex h-8 items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold tracking-wider text-ink tabular-nums">
          Nº {String(number).padStart(4, '0')}
        </span>
        <div className="flex items-center gap-1">
          {hasSmogonData && <SmogonSeal />}
          {onToggleCompare && (
            <CompareCardButton className="relative z-20" name={pokemon} label={name} active={isCompared} full={compareFull} onToggle={onToggleCompare} />
          )}
          {onToggleFavorite && (
            <FavoriteButton className="relative z-20 -mr-1.5" name={pokemon} label={name} active={isFavorite} onToggle={onToggleFavorite} />
          )}
        </div>
      </div>

      <div className="relative isolate my-1 flex h-[150px] items-center justify-center">
        <span aria-hidden="true" className="print-blot absolute -z-10 h-[80%] aspect-[1.1]" style={blotStyleFor(types[0] ?? 'normal')} />
        <CardSprite src={thumbnailSpriteUrl(id ?? number)} priority={priority} />
      </div>

      {/* Nomes longos de formas ("tauros paldea blaze breed") quebram entre palavras, nunca são cortados. */}
      <h3 className="break-words text-center font-serif text-lg font-bold capitalize leading-snug text-ink sm:text-xl">
        {name}
      </h3>
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
        {types.map((type) => (
          <TypeStamp key={type} type={type} />
        ))}
      </div>
    </article>
  );
}

export default memo(PokemonCard);
