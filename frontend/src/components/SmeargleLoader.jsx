import { animatedSpriteUrl } from '../services/api';

const SMEARGLE_ID = 235;

/**
 * Carregamento: o Smeargle animado e, embaixo, uma barra fina em que um trecho percorre o trilho.
 * Com movimento reduzido, a barra fica parada e cheia.
 */
export default function SmeargleLoader({ label, className = '' }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-2.5 ${className}`}>
      <img
        src={animatedSpriteUrl(SMEARGLE_ID)}
        alt=""
        width={58}
        height={49}
        decoding="async"
        className="h-[49px] w-[58px] object-contain [image-rendering:pixelated]"
      />
      <span aria-hidden="true" className="block h-1 w-20 overflow-hidden rounded-full bg-[#2A2421]/10">
        <span className="block h-full w-2/5 animate-loader-sweep rounded-full bg-[#829b72] motion-reduce:w-full motion-reduce:animate-none" />
      </span>
      {label && <span className="font-hand text-lg text-[#785132]">{label}</span>}
    </div>
  );
}
