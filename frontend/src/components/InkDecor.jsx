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
 * Pincelada atrás da marca (logo e mascote): cheia e arredondada à esquerda, onde fica o mascote, afinando
 * com leveza para a direita e saindo em fios de pincel seco. Uma turbulência fraca deixa a borda viva sem
 * ficar áspera. O pai precisa de `relative isolate`.
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
        <filter id={filterId} x="-5%" y="-15%" width="110%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.06" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g fill={color} filter={`url(#${filterId})`}>
        <path opacity="0.42" d="M58.0 7.6C60.3 7.6 67.3 7.7 71.9 7.8C76.6 7.9 81.2 8.0 85.8 8.1C90.5 8.2 95.1 8.3 99.8 8.5C104.4 8.6 109.0 8.8 113.7 9.0C118.3 9.1 122.9 9.3 127.6 9.5C132.2 9.7 136.9 9.9 141.5 10.1C146.1 10.3 150.8 10.5 155.4 10.7C160.1 10.9 164.7 11.0 169.3 11.2C174.0 11.3 178.6 11.5 183.2 11.6C187.9 11.7 192.5 11.8 197.2 11.9C201.8 12.0 206.4 12.0 211.1 12.1C215.7 12.1 220.4 12.1 225.0 12.1C229.6 12.1 234.3 12.1 238.9 12.1C243.6 12.1 248.2 12.0 252.8 12.0C257.5 12.0 262.1 11.9 266.8 11.9C271.4 11.9 276.0 11.9 280.7 11.9C285.3 11.9 289.9 12.0 294.6 12.1C299.2 12.2 303.9 12.3 308.5 12.4C313.1 12.6 317.8 12.8 322.4 13.0C327.1 13.3 331.7 13.6 336.3 13.9C341.0 14.3 345.6 14.7 350.2 15.2C354.9 15.6 359.5 16.1 364.2 16.7C368.8 17.2 373.4 17.8 378.1 18.4C382.7 19.1 389.7 20.1 392.0 20.4Q400.0 20.4 400.0 45.1Q400.0 71.8 392.0 71.8C389.7 72.0 382.7 72.6 378.1 73.0C373.4 73.4 368.8 73.8 364.2 74.1C359.5 74.5 354.9 74.8 350.2 75.2C345.6 75.5 341.0 75.8 336.3 76.1C331.7 76.4 327.1 76.7 322.4 76.9C317.8 77.2 313.1 77.4 308.5 77.7C303.9 77.9 299.2 78.2 294.6 78.4C289.9 78.7 285.3 78.9 280.7 79.1C276.0 79.4 271.4 79.6 266.8 79.9C262.1 80.2 257.5 80.5 252.8 80.8C248.2 81.1 243.6 81.4 238.9 81.8C234.3 82.2 229.6 82.6 225.0 83.0C220.4 83.4 215.7 83.8 211.1 84.3C206.4 84.8 201.8 85.3 197.2 85.8C192.5 86.3 187.9 86.9 183.2 87.4C178.6 88.0 174.0 88.6 169.3 89.1C164.7 89.7 160.1 90.3 155.4 90.8C150.8 91.4 146.1 91.9 141.5 92.5C136.9 93.0 132.2 93.5 127.6 94.0C122.9 94.4 118.3 94.9 113.7 95.2C109.0 95.6 104.4 96.0 99.8 96.3C95.1 96.6 90.5 96.8 85.8 97.0C81.2 97.2 76.6 97.3 71.9 97.4C67.3 97.4 60.3 97.4 58.0 97.4A44.9 44.9 0 0 1 58.0 7.6Z" />
        <path opacity="0.3" d="M352.0 39.6Q385.0 38.1 418.0 39.6Q385.0 41.1 352.0 39.6Z" />
        <path opacity="0.3" d="M340.0 50.5Q377.0 49.2 414.0 50.5Q377.0 51.8 340.0 50.5Z" />
        <path opacity="0.3" d="M376.0 45.5Q396.0 44.5 416.0 45.5Q396.0 46.5 376.0 45.5Z" />
      </g>
    </svg>
  );
});
