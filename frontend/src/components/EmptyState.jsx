import { thumbnailSpriteUrl } from '../services/api';

const SMEARGLE_ID = 235;

/**
 * Lista sem resultado: o sprite do Smeargle em sépia, parado, como uma ilustração impressa na folha,
 * com o recado escrito à mão e, se houver, uma linha de ajuda embaixo.
 */
export default function EmptyState({ title, hint, className = '' }) {
  return (
    <div role="status" className={`col-span-full flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <img
        src={thumbnailSpriteUrl(SMEARGLE_ID)}
        alt=""
        width={72}
        height={72}
        loading="lazy"
        decoding="async"
        className="h-[72px] w-[72px] object-contain opacity-75 [filter:grayscale(1)_sepia(0.6)_contrast(1.15)] [image-rendering:pixelated]"
      />
      <p className="mt-2 font-hand text-2xl leading-tight text-umber">{title}</p>
      {hint && <p className="mt-1 max-w-sm font-reading text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}
