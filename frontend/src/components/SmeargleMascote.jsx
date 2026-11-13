import { memo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { animatedSpriteUrl, thumbnailSpriteUrl } from '../services/api';

const SMEARGLE_ID = 235;

// Gotas de tinta na borda da paleta: as cores dos tubos do ateliê.
const PAINT_DABS = [
  { color: '#829b72', className: 'left-0 top-1.5 h-3.5 w-4 rounded-[60%_40%_55%_45%]' },
  { color: '#B98428', className: 'right-0.5 top-0.5 h-3 w-3.5 rounded-[45%_55%_40%_60%]' },
  { color: '#9E3D64', className: 'right-0 bottom-3 h-3.5 w-3 rounded-[55%_45%_60%_40%]' },
  { color: '#4F6D8A', className: 'bottom-0.5 left-2.5 h-3 w-3.5 rounded-[50%_50%_45%_55%]' },
];

/**
 * Mascote do header: o Smeargle animado sobre uma paleta de pintor, com as tintas do ateliê em volta.
 * Balança de leve, solta um respingo de tinta no hover e alterna para o shiny no clique.
 */
function SmeargleMascote({ className = '' }) {
  const [shiny, setShiny] = useState(false);
  const [animatedFailed, setAnimatedFailed] = useState(false);
  const src = animatedFailed ? thumbnailSpriteUrl(SMEARGLE_ID) : animatedSpriteUrl(SMEARGLE_ID, { shiny });

  return (
    <button
      type="button"
      onClick={() => setShiny((value) => !value)}
      aria-pressed={shiny}
      aria-label={shiny ? 'Voltar o Smeargle às cores normais' : 'Mostrar o Smeargle shiny'}
      title={shiny ? 'Smeargle shiny' : 'Smeargle'}
      className={`group relative block h-20 w-20 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70 ${className}`}
    >
      {PAINT_DABS.map(({ color, className: dab }) => (
        <span
          key={color}
          aria-hidden="true"
          className={`absolute z-10 transition-transform duration-300 ease-out group-hover:scale-125 motion-reduce:transition-none ${dab}`}
          style={{ backgroundColor: color }}
        />
      ))}

      <span className="absolute inset-1.5 overflow-hidden rounded-full border-[1.5px] border-[#F7F3EE]/70 bg-[#F7F3EE] shadow-[inset_0_-4px_8px_rgba(42,36,33,0.12)]">
        {/* Respingo da cauda: estoura atrás do Smeargle no hover, na cor da tinta do momento. */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 scale-50 rounded-[48%_52%_44%_56%/54%_46%_54%_46%] opacity-0 blur-[1px] transition-[transform,opacity] duration-300 ease-out group-hover:scale-110 group-hover:opacity-60 motion-reduce:transition-none"
          style={{ backgroundColor: shiny ? '#9E3D64' : '#829b72' }}
        />
        <img
          key={src}
          src={src}
          alt=""
          width={64}
          height={64}
          decoding="async"
          onError={() => setAnimatedFailed(true)}
          className="relative h-full w-full object-contain [image-rendering:pixelated] animate-mascot-bob motion-reduce:animate-none"
        />
      </span>

      {shiny && (
        <Sparkles className="absolute right-0 top-0 z-20 h-5 w-5 text-[#E9C46A] drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" aria-hidden="true" />
      )}
    </button>
  );
}

export default memo(SmeargleMascote);
