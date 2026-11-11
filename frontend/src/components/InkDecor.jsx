import { memo } from 'react';

/** Mancha de pincel decorativa. Posiciona-se com `className` (absolute/fixed + coordenadas). */
export const InkSplatter = memo(function InkSplatter({ className = '', color = '#829b72' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={`pointer-events-none select-none ${className}`}>
      <path
        fill={color}
        d="M98 22c22-8 48 2 60 22s30 28 20 52-22 46-50 54-54 2-70-14S26 106 28 80s12-44 38-50 24 0 32-8z"
      />
      <circle cx="172" cy="38" r="7" fill={color} />
      <circle cx="28" cy="162" r="5" fill={color} />
      <circle cx="184" cy="150" r="3" fill={color} />
      <circle cx="60" cy="18" r="2.5" fill={color} />
    </svg>
  );
});

const SPLASH_GRAIN = {
  backgroundImage:
    'radial-gradient(rgba(255, 253, 249, 0.07) 1px, transparent 1px), radial-gradient(ellipse at 30% 40%, rgba(38, 26, 19, 0.25), transparent 70%)',
  backgroundSize: '5px 5px, auto',
};

/**
 * Mancha de tinta castanha atrás de um bloco de texto. O pai precisa de `relative isolate`;
 * a mancha ocupa o pai inteiro (inset-0) e acompanha o seu tamanho, incluindo no header colapsado.
 */
export const InkSplash = memo(function InkSplash({ className = '' }) {
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 ${className}`}>
      <span
        className="absolute inset-0 rounded-[46%_54%_38%_62%/58%_42%_60%_40%] bg-[#4A3B32]/40 backdrop-blur-[2px] shadow-[inset_0_0_14px_rgba(38,26,19,0.35)]"
        style={SPLASH_GRAIN}
      />
      <span className="absolute -right-2.5 top-0.5 w-3 h-3 rounded-[60%_40%_55%_45%/45%_60%_40%_55%] bg-[#4A3B32]/45" />
      <span className="absolute -right-4 top-4 w-1.5 h-1.5 rounded-full bg-[#4A3B32]/35" />
      <span className="absolute -left-1.5 bottom-1 w-2 h-2 rounded-full bg-[#4A3B32]/40" />
      <span className="absolute right-8 -bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#4A3B32]/30" />
    </span>
  );
});

/** Bordo de papel rasgado para o fundo de um bloco; herda a cor via `text-*`. */
export const TornEdge = memo(function TornEdge({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 10"
      preserveAspectRatio="none"
      className={`pointer-events-none block w-full h-[10px] ${className}`}
    >
      <path
        fill="currentColor"
        d="M0 0h1200v4c-18 3-36-1-54 2s-36 4-54 1-38-3-56 0-38 4-56 1-42-3-60 0-34 2-52 0-38-2-56 1-42 3-60 0-38-3-56 0-38 4-56 1-42-3-60 0-34 2-52 0-38-2-56 1-42 3-60 0-38-3-56 0-38 4-56 1-42-3-60 0-34 2-52 0-38-2-56 1-30 2-48 0L0 4z"
      />
    </svg>
  );
});

/** Vinheta fixa nas margens do ecrã: profundidade de diário físico sem custo de layout. */
export const PageVignette = memo(function PageVignette() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30"
      style={{
        background: 'radial-gradient(ellipse at center, transparent 58%, rgba(62, 46, 36, 0.16) 100%)',
        boxShadow: 'inset 0 0 96px rgba(62, 46, 36, 0.14)',
      }}
    />
  );
});
