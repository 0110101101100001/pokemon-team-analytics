import { animatedSpriteUrl } from '../services/api';

const SMEARGLE_ID = 235;

/**
 * Carregamento: o Smeargle animado e, embaixo, um traço de pincel fino que se desenha da esquerda para a direita
 * e recomeça. Com movimento reduzido, o traço fica parado e inteiro.
 */
export default function BrushLoader({ label, className = '' }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <img
        src={animatedSpriteUrl(SMEARGLE_ID)}
        alt=""
        width={58}
        height={49}
        decoding="async"
        className="h-[49px] w-[58px] object-contain [image-rendering:pixelated]"
      />
      <svg aria-hidden="true" viewBox="0 0 120 10" preserveAspectRatio="none" className="h-[4px] w-20">
        <path
          fill="#829b72"
          className="origin-left animate-brush-draw [transform-box:fill-box] motion-reduce:animate-none"
          d="M2 6.1C14 3.3 27 2.5 41 3.1c13 .6 24 1.8 38 1.2 13-.6 25-2.3 38-1.5 1.7.1 2 2.4.3 2.9-12 3.5-25 3.2-38 3.5-14 .3-27-1-41-.7-12 .3-23 1.7-35 1.2C.9 9.6.3 6.5 2 6.1z"
        />
      </svg>
      {label && <span className="mt-1 font-hand text-xl text-[#785132]">{label}</span>}
    </div>
  );
}
