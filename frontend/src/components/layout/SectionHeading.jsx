import { BrushHighlight, InkRule } from '../InkDecor';
import { useHashPath } from '../../hooks/useHashPath';
import { sectionFromPath } from '../../navigation/sections';

/**
 * Cabeçalho de página: o título da aba sobre uma pincelada de tinta, o subtítulo logo abaixo (contagem de
 * resultados ou a descrição da aba), um bloco opcional à direita e a pincelada que fecha o cabeçalho.
 * A tinta é a da aba aberta.
 */
export default function SectionHeading({ title, subtitle, aside }) {
  const pigment = sectionFromPath(useHashPath()).pigment;
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-end">
        <div>
          <h2 className="relative isolate inline-block font-serif text-[1.75rem] font-black leading-tight tracking-tight text-[#2A2421] sm:text-4xl">
            <BrushHighlight color={pigment} />
            {title}
          </h2>
          {subtitle && <p className="mt-1.5 max-w-prose text-sm text-[#785132]">{subtitle}</p>}
        </div>
        {aside && <div className="self-start sm:self-auto">{aside}</div>}
      </div>
      <InkRule className="mt-3" wash={pigment} />
    </div>
  );
}

// Selo de tinta: contorno a nanquim e o texto em serifa, levemente torto como um carimbo.
// O pingo de magenta queimado à esquerda é a tinta que sobrou no carimbo.
export const HEADING_PILL_CLASS =
  'inline-flex -rotate-1 items-center gap-1.5 rounded-full border-[1.5px] border-paint-ochre/80 bg-[#FFFAF0] px-3.5 py-1.5 font-serif text-[13px] font-semibold italic leading-none text-[#6E4E14] shadow-[2px_2px_0_rgba(185,132,40,0.28)] before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-paint-magenta before:content-[""]';
