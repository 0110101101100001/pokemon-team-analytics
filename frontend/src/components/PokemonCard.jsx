import { memo } from 'react';
import { Shield } from 'lucide-react';
import PokemonTypeBadge, { TYPE_INK } from './PokemonTypeBadge';
import FavoriteButton from './FavoriteButton';
import { thumbnailSpriteUrl } from '../services/api';

// Aguada de cada tipo: [tom da tinta diluída, fundo do papel tingido].
const TYPE_WASHES = {
  grass: ['#cfe3b4', '#f0f7e0'],
  fire: ['#f7cfa8', '#fef0e1'],
  water: ['#b9d7ea', '#e1f0f7'],
  electric: ['#f6e19b', '#fef7e1'],
  bug: ['#d8e0a6', '#f0f4de'],
  normal: ['#dedcc6', '#f5f5ed'],
  poison: ['#e0c3e0', '#f4e7f4'],
  ground: ['#ead6a7', '#f7ecd6'],
  fairy: ['#f3cdd8', '#fbeef1'],
  fighting: ['#e5c3b9', '#f4e5e1'],
  psychic: ['#ecc5d2', '#f4e5ea'],
  rock: ['#e0d2bc', '#f4ede4'],
  ghost: ['#d3c4e0', '#ece4f0'],
  ice: ['#c3e4ea', '#e7f4f7'],
  dragon: ['#d6c6e6', '#f0e6f5'],
  dark: ['#d4cbc2', '#ece8e4'],
  steel: ['#d3d3e0', '#ececf2'],
  flying: ['#d7cdea', '#f1ecf4'],
};

// 18 objetos de fundo compartilhados por todas as cartas, em vez de um por instância.
const backgroundStyles = new Map();
function backgroundStyleFor(type) {
  let style = backgroundStyles.get(type);
  if (!style) {
    const [wash, paper] = TYPE_WASHES[type] ?? TYPE_WASHES.normal;
    style = {
      // Tinta do respingo que estoura atrás do sprite no hover (.ink-splat): a cor forte do tipo.
      '--splat': (TYPE_INK[type] ?? TYPE_INK.normal).border,
      backgroundColor: paper,
      backgroundImage: `radial-gradient(ellipse 75% 55% at 50% 42%, ${wash}, transparent 72%), var(--paper-grain)`,
      backgroundSize: 'auto, 220px 220px',
    };
    backgroundStyles.set(type, style);
  }
  return style;
}

const displayName = (name) => name.replace(/-/g, ' ');

/*
  Contorno de pincel do hover: o traço corre sobre a borda do card, a partir do canto de cima.
  O retângulo é medido em pixels (sem viewBox), para o traço cair exatamente sobre a borda de 1,5px;
  pathLength="1" deixa a animação (index.css, .ink-outline) independente do tamanho do card.
*/
const OUTLINE_GEOMETRY = {
  x: '2.25px',
  y: '2.25px',
  width: 'calc(100% - 4.5px)',
  height: 'calc(100% - 4.5px)',
  // O mesmo raio do card (rounded-[1.25rem]), descontada a metade da borda.
  rx: 'calc(1.25rem - 0.75px)',
};

const BrushOutline = memo(function BrushOutline() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute -inset-[1.5px] h-[calc(100%+3px)] w-[calc(100%+3px)] overflow-visible">
      <rect className="ink-outline" pathLength="1" style={OUTLINE_GEOMETRY} />
    </svg>
  );
});

function PokemonCard({
  pokemon,
  id,
  number,
  types = [],
  isSelected,
  hasSmogonData = false,
  isFavorite = false,
  onSelect,
  onToggleFavorite,
}) {
  const handleSelect = () => onSelect(pokemon);
  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  };

  const name = displayName(pokemon);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Abrir a ficha de ${name}`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      style={backgroundStyleFor(types[0] ?? 'normal')}
      className={`ink-splat group relative cursor-pointer select-none rounded-[1.25rem] border-[1.5px] p-4 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EE] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5 ${
        isSelected
          ? 'border-[#2A2421] shadow-[3px_3px_0_rgba(42,36,33,0.1)]'
          : 'border-[#2A2421]/25 shadow-[3px_3px_0_rgba(42,36,33,0.1)] hover:shadow-[4px_5px_0_rgba(42,36,33,0.2)]'
      }`}
    >
      <BrushOutline />
      <div className="relative mb-2 flex items-center justify-between gap-2 sm:mb-3">
        <span className="shrink-0 rounded-md border border-[#2A2421]/20 bg-[#FFFEFB]/85 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#2A2421] tabular-nums">
          Nº {String(number).padStart(3, '0')}
        </span>
        <div className="flex items-center gap-1.5">
          {hasSmogonData && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-paint-ochre/50 bg-[#FBF1DC] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#6E4E14]">
              <Shield className="h-2.5 w-2.5 fill-paint-ochre text-paint-ochre" aria-hidden="true" />
              Smogon
            </span>
          )}
          {onToggleFavorite && (
            <FavoriteButton name={pokemon} label={name} active={isFavorite} onToggle={onToggleFavorite} />
          )}
        </div>
      </div>

      <div className="relative mb-2 flex h-36 w-full items-center justify-center sm:mb-3 sm:h-40">
        <img
          src={thumbnailSpriteUrl(id ?? number)}
          alt=""
          width={128}
          height={128}
          loading="lazy"
          decoding="async"
          className="h-32 w-32 object-contain transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.04] md:drop-shadow-[0_8px_8px_rgba(42,36,33,0.2)] motion-reduce:transform-none"
        />
      </div>

      <div className="relative space-y-2 text-center">
        {/* Nomes longos de formas ("tauros paldea blaze breed") quebram entre palavras, nunca são cortados. */}
        <h3 className="break-words font-serif text-base font-bold capitalize leading-snug tracking-tight text-[#2A2421] sm:text-lg">
          {name}
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-1">
          {types.map((type) => (
            <PokemonTypeBadge key={type} type={type} />
          ))}
        </div>
      </div>
    </article>
  );
}

export default memo(PokemonCard);
