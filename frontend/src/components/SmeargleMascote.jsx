import { memo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { animatedSpriteUrl, thumbnailSpriteUrl } from '../services/api';

const SMEARGLE_ID = 235;


/**
 * Mascote do header: o Smeargle animado, ampliado num medalhão de papel com borda creme e contorno a nanquim.
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
      <span className="absolute inset-1 overflow-hidden rounded-full border-[3px] border-[#FFFDF9] bg-[#F7F3EE] shadow-[0_0_0_1.5px_rgba(42,36,33,0.6),3px_3px_0_rgba(42,36,33,0.28),inset_0_-4px_8px_rgba(42,36,33,0.12)]">
        {/* Respingo da cauda: estoura atrás do Smeargle no hover, na cor da tinta do momento. */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 scale-50 rounded-[48%_52%_44%_56%/54%_46%_54%_46%] opacity-0 blur-[1px] transition-[transform,opacity] duration-300 ease-out group-hover:scale-110 group-hover:opacity-60 motion-reduce:transition-none"
          style={{ backgroundColor: shiny ? '#9E3D64' : '#829b72' }}
        />
        {/* O GIF tem bastante espaço vazio em volta: a ampliação aproxima o Smeargle. */}
        <span className="absolute inset-0 origin-[50%_60%] scale-[1.3]">
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
      </span>

      {shiny && (
        <Sparkles className="absolute -right-0.5 -top-0.5 z-20 h-5 w-5 text-[#E9C46A] drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" aria-hidden="true" />
      )}
    </button>
  );
}

export default memo(SmeargleMascote);
