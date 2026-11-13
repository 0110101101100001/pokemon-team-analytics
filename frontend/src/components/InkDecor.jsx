import { memo } from 'react';

/** Mancha de pincel decorativa. Posicione com `className` (absolute/fixed + coordenadas). */
export const InkSplatter = memo(function InkSplatter({ className = '', color = '#829b72' }) {
  return (
    // overflow-anchor: none: uma mancha presa ao fim da página não pode servir de âncora de rolagem,
    // senão a página rola para acompanhá-la cada vez que a grade cresce.
    <svg aria-hidden="true" viewBox="0 0 200 200" className={`pointer-events-none select-none [overflow-anchor:none] ${className}`}>
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
        className="absolute inset-0 rounded-[46%_54%_38%_62%/58%_42%_60%_40%] bg-[#4A3B32]/40 md:backdrop-blur-[2px] shadow-[inset_0_0_14px_rgba(38,26,19,0.35)]"
        style={SPLASH_GRAIN}
      />
      <span className="absolute -right-2.5 top-0.5 w-3 h-3 rounded-[60%_40%_55%_45%/45%_60%_40%_55%] bg-[#4A3B32]/45" />
      <span className="absolute -right-4 top-4 w-1.5 h-1.5 rounded-full bg-[#4A3B32]/35" />
      <span className="absolute -left-1.5 bottom-1 w-2 h-2 rounded-full bg-[#4A3B32]/40" />
      <span className="absolute right-8 -bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#4A3B32]/30" />
    </span>
  );
});

/** Borda de papel rasgado para o fundo de um bloco; herda a cor via `text-*`. */
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

/** Linha divisória traçada à mão, com a gota de tinta onde a pena parou. */
// A gota fica fora do SVG: com preserveAspectRatio="none" um círculo viraria uma elipse esticada.
export const InkRule = memo(function InkRule({ className = '' }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none flex items-center gap-1 text-[#785132] ${className}`}>
      <svg viewBox="0 0 1000 14" preserveAspectRatio="none" className="block h-3.5 min-w-0 flex-1">
        <path
          d="M2 8C120 5 240 10 360 7S600 5 720 8 900 10 998 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="10 5 22 6 4 6"
          opacity="0.55"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="h-1.5 w-2 shrink-0 rounded-[60%_40%_55%_45%] bg-current opacity-55" />
    </div>
  );
});

/**
 * Pincelada de aquarela atrás de um título. O pai precisa de `relative isolate`;
 * a mancha cobre a metade de baixo do texto, como marca-texto passado com pincel.
 */
export const BrushHighlight = memo(function BrushHighlight({ color = '#A4C294', className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 40"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute -inset-x-2 bottom-0 -z-10 h-[58%] w-[calc(100%+1rem)] ${className}`}
    >
      <path
        fill={color}
        opacity="0.45"
        d="M6 14c32-7 71-9 112-7 37 2 70 6 108 3 26-2 46-4 66-1 6 1 8 9 3 12-22 9-49 7-77 10-37 4-71 1-107 3-33 2-62 7-95 6-11 0-19-5-20-13-1-7 4-11 10-13z"
      />
      <path fill={color} opacity="0.3" d="M20 26c50-5 115 0 170-3 32-2 62-3 92-1 4 3-1 8-6 9-61 4-134 3-201 5-26 1-56-2-55-10z" />
    </svg>
  );
});

/** Vinheta fixa nas margens da tela: profundidade de diário físico sem custo de layout. */
export const PageVignette = memo(function PageVignette() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 hidden md:block"
      style={{
        background: 'radial-gradient(ellipse at center, transparent 58%, rgba(62, 46, 36, 0.16) 100%)',
        boxShadow: 'inset 0 0 96px rgba(62, 46, 36, 0.14)',
      }}
    />
  );
});
