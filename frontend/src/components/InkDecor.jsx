import { memo, useId } from 'react';

/** Mancha de pincel decorativa. Posicione com `className` (absolute + coordenadas). */
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

/**
 * Borda inferior do header: a pincelada grossa que termina em franja de cerdas, com escorridos e respingos.
 * O desenho é um ladrilho que se repete na horizontal sem esticar (index.css, .ink-brush-edge).
 */
export const InkEdge = memo(function InkEdge({ className = '' }) {
  return <div aria-hidden="true" className={`ink-brush-edge pointer-events-none w-full ${className}`} />;
});

/**
 * Divisória de pincel: o traço engrossa no meio e afina nas pontas, com a gota onde o pincel parou.
 * `wash` pinta uma aguada larga de aquarela por baixo do traço.
 */
// A gota fica fora do SVG: com preserveAspectRatio="none" um círculo viraria uma elipse esticada.
export const InkRule = memo(function InkRule({ className = '', wash }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none flex items-center gap-1.5 text-[#2A2421] ${className}`}>
      <svg viewBox="0 0 1000 12" preserveAspectRatio="none" className="block h-2.5 min-w-0 flex-1 overflow-visible">
        {wash && (
          <path
            fill={wash}
            opacity="0.35"
            d="M10 9c120-6 260-8 400-6 150 2 300 5 440 2 60-1 110 0 140 2 6 3 2 8-6 9-140 4-300 2-450 3-160 1-320 3-480 0-30 0-50-6-44-10z"
          />
        )}
        <path
          fill="currentColor"
          opacity="0.7"
          d="M0 6.4C90 5.2 170 3.6 260 3.9c110 .4 210 1.7 320 1.2 120-.6 240-2 340-.9 30 .3 60 .9 80 1.6v1.4c-20 .5-50 .9-80 1.3-100 1.2-220.5 0-340-.2-110-.2-210 1.4-320 1.5C170 8.9 90 7.6 0 6.4z"
        />
      </svg>
      <span className="h-2 w-2.5 shrink-0 rounded-[60%_40%_55%_45%/55%_60%_40%_45%] bg-current opacity-80" />
    </div>
  );
});

/**
 * Pincelada de tinta atrás de um título. O pai precisa de `relative isolate`;
 * a mancha cobre a metade de baixo do texto, como uma passada de pincel carregado.
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
        opacity="0.5"
        d="M6 14c32-7 71-9 112-7 37 2 70 6 108 3 26-2 46-4 66-1 6 1 8 9 3 12-22 9-49 7-77 10-37 4-71 1-107 3-33 2-62 7-95 6-11 0-19-5-20-13-1-7 4-11 10-13z"
      />
      <path fill={color} opacity="0.35" d="M20 26c50-5 115 0 170-3 32-2 62-3 92-1 4 3-1 8-6 9-61 4-134 3-201 5-26 1-56-2-55-10z" />
    </svg>
  );
});

/**
 * Mancha de tinta atrás da marca (logo e mascote): elipses fundidas num grupo translúcido e uma turbulência
 * que deixa a borda irregular, como tinta absorvida pelo papel. O pai precisa de `relative isolate`.
 */
export const InkStain = memo(function InkStain({ className = '', color = '#3A2C24' }) {
  const filterId = useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute -z-10 overflow-visible ${className}`}
    >
      <defs>
        <filter id={filterId} x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.09" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="11" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g fill={color} opacity="0.42" filter={`url(#${filterId})`}>
        <ellipse cx="60" cy="50" rx="50" ry="46" />
        <ellipse cx="225" cy="53" rx="166" ry="35" />
        <ellipse cx="140" cy="32" rx="58" ry="23" />
        <ellipse cx="255" cy="31" rx="70" ry="17" />
        <ellipse cx="300" cy="74" rx="70" ry="19" />
        <ellipse cx="366" cy="49" rx="27" ry="25" />
        <ellipse cx="118" cy="76" rx="44" ry="19" />
      </g>
    </svg>
  );
});
