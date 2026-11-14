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
 * Pincelada atrás da marca (logo e mascote): mais larga no meio e fechando nas pontas de forma assimétrica,
 * arredondada à esquerda e afilada à direita, onde sai em fios de pincel seco. As bordas de cima e de baixo
 * ondulam cada uma do seu jeito, como tinta fresca; uma turbulência fraca deixa o contorno vivo sem ficar áspero.
 * O pai precisa de `relative isolate`.
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
        <path opacity="0.42" d="M6.0 51.2C6.0 48.9 6.2 46.3 6.6 44.2C7.0 42.1 7.6 40.3 8.4 38.5C9.2 36.7 10.1 35.1 11.3 33.5C12.4 31.9 13.8 30.3 15.4 28.8C16.9 27.3 18.6 25.9 20.6 24.7C22.5 23.4 24.6 22.3 26.8 21.3C29.1 20.3 31.5 19.4 34.2 18.5C36.8 17.5 39.5 16.7 42.5 15.7C45.4 14.7 48.5 13.6 51.8 12.6C55.0 11.6 58.4 10.4 61.9 9.7C65.5 9.0 69.2 8.6 73.0 8.6C76.8 8.6 80.7 9.4 84.7 9.7C88.8 10.0 93.0 10.8 97.2 10.6C101.5 10.4 105.8 9.5 110.3 8.5C114.7 7.6 119.3 5.8 123.9 4.9C128.5 4.1 133.2 3.8 138.0 3.7C142.7 3.5 147.6 4.1 152.4 3.8C157.3 3.5 162.2 2.6 167.1 1.9C172.1 1.3 177.0 -0.1 182.0 -0.0C187.0 0.1 192.0 1.3 197.0 2.5C202.0 3.6 207.0 5.9 212.0 6.9C217.0 8.0 221.9 8.3 226.9 8.6C231.8 8.9 236.7 8.5 241.6 8.9C246.4 9.3 251.3 10.3 256.0 11.1C260.8 11.9 265.5 13.1 270.1 13.5C274.7 14.0 279.3 13.8 283.7 13.8C288.2 13.9 292.5 13.5 296.8 13.8C301.0 14.2 305.2 15.0 309.3 16.0C313.3 17.0 317.2 18.5 321.0 19.7C324.8 21.0 328.5 22.3 332.1 23.3C335.6 24.4 339.0 25.3 342.2 26.2C345.5 27.1 348.6 27.9 351.5 28.8C354.5 29.7 357.2 30.7 359.8 31.7C362.5 32.6 364.9 33.6 367.2 34.6C369.4 35.5 371.5 36.4 373.4 37.3C375.4 38.1 377.1 38.9 378.6 39.6C380.2 40.3 381.6 41.0 382.7 41.6C383.9 42.2 384.8 42.7 385.6 43.1C386.4 43.6 387.0 44.0 387.4 44.3C387.8 44.6 388.0 44.7 388.0 44.9C388.0 45.1 387.8 45.3 387.4 45.6C387.0 45.9 386.4 46.4 385.6 47.0C384.8 47.5 383.9 48.1 382.7 48.8C381.6 49.4 380.2 50.1 378.6 50.9C377.1 51.6 375.4 52.5 373.4 53.3C371.5 54.1 369.4 54.9 367.2 55.7C364.9 56.5 362.5 57.3 359.8 58.2C357.2 59.0 354.5 59.8 351.5 60.6C348.6 61.5 345.5 62.4 342.2 63.4C339.0 64.4 335.6 65.5 332.1 66.6C328.5 67.7 324.8 69.0 321.0 70.1C317.2 71.2 313.3 72.3 309.3 73.1C305.2 73.9 301.0 74.5 296.8 74.9C292.5 75.4 288.2 75.5 283.7 76.1C279.3 76.6 274.7 77.2 270.1 78.3C265.5 79.4 260.8 81.0 256.0 82.5C251.3 84.0 246.4 86.0 241.6 87.3C236.7 88.5 231.8 89.4 226.9 90.1C221.9 90.8 217.0 90.8 212.0 91.4C207.0 92.0 202.0 92.7 197.0 93.7C192.0 94.8 187.0 96.6 182.0 97.7C177.0 98.8 172.1 100.2 167.1 100.6C162.2 100.9 157.3 100.4 152.4 99.9C147.6 99.3 142.7 97.9 138.0 97.2C133.2 96.5 128.5 96.0 123.9 95.8C119.3 95.6 114.7 96.2 110.3 96.3C105.8 96.4 101.5 96.8 97.2 96.6C93.0 96.4 88.8 95.8 84.7 95.1C80.7 94.3 76.8 93.1 73.0 92.1C69.2 91.2 65.5 90.2 61.9 89.4C58.4 88.7 55.0 88.1 51.8 87.6C48.5 87.1 45.4 86.8 42.5 86.3C39.5 85.8 36.8 85.3 34.2 84.6C31.5 83.8 29.1 83.0 26.8 81.9C24.6 80.9 22.5 79.7 20.6 78.4C18.6 77.0 16.9 75.6 15.4 74.1C13.8 72.5 12.4 70.9 11.3 69.2C10.1 67.6 9.2 65.9 8.4 64.1C7.6 62.2 7.0 60.4 6.6 58.3C6.2 56.1 6.0 53.5 6.0 51.2Z" />
        <path opacity="0.3" d="M349.8 40.8Q376.8 39.5 403.8 40.8Q376.8 42.1 349.8 40.8Z" />
        <path opacity="0.3" d="M342.2 49.4Q373.2 48.3 404.2 49.4Q373.2 50.5 342.2 49.4Z" />
        <path opacity="0.3" d="M365.1 45.3Q382.1 44.4 399.1 45.3Q382.1 46.2 365.1 45.3Z" />
      </g>
    </svg>
  );
});
