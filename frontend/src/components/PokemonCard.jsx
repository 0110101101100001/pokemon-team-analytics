import { memo, useEffect, useRef } from 'react';
import { Shield } from 'lucide-react';
import PokemonTypeBadge from './PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../services/api';
import { observeInView } from '../utils/inView';

// Gradientes suaves por tipo — fundo da "carta colecionável"
const TYPE_GRADIENTS = {
  grass:   ['#f0f7e0', '#e2edcc'],
  fire:    ['#fef0e1', '#fce3d1'],
  water:   ['#e1f0f7', '#d4e8f1'],
  electric:['#fef7e1', '#fcefd1'],
  bug:     ['#f0f4de', '#e8ecce'],
  normal:  ['#f5f5ed', '#eaeae0'],
  poison:  ['#f4e7f4', '#ecdcec'],
  ground:  ['#f7ecd6', '#efe4c8'],
  fairy:   ['#fbeef1', '#f6e3ea'],
  fighting:['#f4e5e1', '#ebdcd7'],
  psychic: ['#f4e5ea', '#ebdce1'],
  rock:    ['#f4ede4', '#eae4d8'],
  ghost:   ['#ece4f0', '#e3d9ea'],
  ice:     ['#e7f4f7', '#dfeef1'],
  dragon:  ['#f0e6f5', '#e6dcec'],
  dark:    ['#ece8e4', '#e6e2dd'],
  steel:   ['#ececf2', '#e4e4ea'],
  flying:  ['#f1ecf4', '#e8e3ef'],
};

const MAX_TILT_DEG = 7;
// 1 = o canto sob o mouse afunda (convenção das cartas holográficas); -1 = o canto sob o mouse se aproxima.
const TILT_DIRECTION = 1;
const STAGGER_STEP_MS = 45;

const PAPER_VIGNETTE = 'radial-gradient(ellipse at 50% 28%, transparent 55%, rgba(120, 81, 50, 0.10))';
const PAPER_DOTS = 'radial-gradient(rgba(120, 81, 50, 0.10) 1px, transparent 1px)';

// A inclinação 3D e as camadas de parallax vivem em index.css (.card-tilt, .card-layer-*) e só valem
// com mouse; em telas touch os cards ficam planos, sem perspectiva nem camadas de composição extras.
// Estilo estático compartilhado por todas as cartas: zero alocações por render.
const GLARE_STYLE = {
  background:
    'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 60%)',
};

// 18 objetos de fundo compartilhados pelas 1025 cartas, em vez de um por instância.
const backgroundStyles = new Map();
function backgroundStyleFor(type) {
  let style = backgroundStyles.get(type);
  if (!style) {
    const [from, to] = TYPE_GRADIENTS[type] ?? TYPE_GRADIENTS.normal;
    style = {
      backgroundImage: `${PAPER_VIGNETTE}, ${PAPER_DOTS}, linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
      backgroundSize: 'auto, 10px 10px, auto',
    };
    backgroundStyles.set(type, style);
  }
  return style;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function PokemonCard({
  pokemon,
  id,
  number,
  types = [],
  isSelected,
  hasSmogonData = false,
  onSelect,
}) {
  const wrapperRef = useRef(null);
  const cardRef = useRef(null);
  const boundsRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(0);

  useEffect(() => observeInView(wrapperRef.current), []);

  const applyTilt = () => {
    frameRef.current = 0;
    const el = cardRef.current;
    const bounds = boundsRef.current;
    if (!el || !bounds) return;

    const px = Math.min(Math.max((pointerRef.current.x - bounds.left) / bounds.width, 0), 1);
    const py = Math.min(Math.max((pointerRef.current.y - bounds.top) / bounds.height, 0), 1);
    const rx = (0.5 - py) * 2 * MAX_TILT_DEG * TILT_DIRECTION;
    const ry = (px - 0.5) * 2 * MAX_TILT_DEG * TILT_DIRECTION;

    el.style.setProperty('--rx', rx.toFixed(2));
    el.style.setProperty('--ry', ry.toFixed(2));
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
  };

  const handlePointerEnter = (e) => {
    if (e.pointerType === 'touch' || prefersReducedMotion()) return;
    boundsRef.current = e.currentTarget.getBoundingClientRect();
  };

  const handlePointerMove = (e) => {
    if (!boundsRef.current) return;
    pointerRef.current.x = e.clientX;
    pointerRef.current.y = e.clientY;
    if (!frameRef.current) frameRef.current = requestAnimationFrame(applyTilt);
  };

  const handlePointerLeave = () => {
    boundsRef.current = null;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    const el = cardRef.current;
    if (!el) return;
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
    el.style.removeProperty('--mx');
    el.style.removeProperty('--my');
  };

  const handleSelect = () => onSelect(pokemon);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  };

  const primaryType = types[0] ?? 'normal';

  return (
    <div
      ref={wrapperRef}
      className="opacity-0 translate-y-5 scale-[0.96] transition-[opacity,transform] duration-700 ease-out data-[inview]:opacity-100 data-[inview]:translate-y-0 data-[inview]:scale-100 motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:transition-none"
      style={{ transitionDelay: `${(number % 4) * STAGGER_STEP_MS}ms` }}
    >
      <article
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        className={`card-tilt group relative p-4 sm:p-5 cursor-pointer select-none rounded-[1.6rem_1.3rem_1.6rem_1.2rem] border transition-[transform,box-shadow] duration-300 ease-out hover:[--lift:-6] hover:will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#829b72]/70 motion-reduce:transition-none ${
          isSelected
            ? 'border-[#829b72] ring-2 ring-[#829b72] shadow-card [--lift:-4]'
            : 'border-[#4A3B32]/15 shadow-xs hover:border-[#829b72]/50 hover:shadow-card-hover'
        }`}
      >
        {/* Camada de fundo: papel de caderno + gradiente do tipo + brilho que segue o mouse */}
        <div
          aria-hidden="true"
          className="card-layer-bg absolute inset-0 rounded-[inherit] overflow-hidden"
          style={backgroundStyleFor(primaryType)}
        >
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 mix-blend-soft-light max-md:hidden motion-reduce:hidden"
            style={GLARE_STYLE}
          />
          <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/50" />
        </div>

        {/* Camada média: número e selo Smogon */}
        <div className="card-layer-near relative flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <span className="shrink-0 px-2.5 py-0.5 rounded-md bg-[#FFFEFB]/85 border border-[#4A3B32]/15 font-mono text-[10px] font-bold text-[#4A3B32] tracking-wider shadow-xs">
            Nº {String(number).padStart(3, '0')}
          </span>
          {hasSmogonData && (
            <span className="flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFFEFB]/85 border border-[#4A3B32]/15 text-[9px] font-bold uppercase tracking-wider text-[#4A3B32] shadow-xs">
              <Shield className="w-2.5 h-2.5 fill-[#4A3B32]" aria-hidden="true" />
              Smogon
            </span>
          )}
        </div>

        {/* Camada da frente: sprite com parallax */}
        <div className="card-layer-sprite relative flex items-center justify-center h-36 sm:h-40 w-full mb-2 sm:mb-3">
          <img
            src={thumbnailSpriteUrl(id ?? number)}
            alt={pokemon}
            width={128}
            height={128}
            loading="lazy"
            decoding="async"
            className="w-32 h-32 object-contain transition-transform duration-500 ease-out md:group-hover:scale-110 md:drop-shadow-[0_10px_12px_rgba(62,46,36,0.22)] motion-reduce:transform-none"
          />
        </div>

        {/* Camada média: nome e tipos */}
        <div className="card-layer-near relative text-center space-y-2">
          {/* Nomes longos de formas ("tauros paldea blaze breed") quebram entre palavras, nunca são cortados. */}
          <h3 className="break-words font-serif font-bold text-base sm:text-lg leading-snug text-[#3E3A35] capitalize tracking-tight">
            {pokemon.replace(/-/g, ' ')}
          </h3>
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {types.map((type) => (
              <PokemonTypeBadge key={type} type={type} />
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

export default memo(PokemonCard);
