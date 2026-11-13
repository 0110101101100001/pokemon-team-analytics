import { BrushHighlight, InkRule } from '../InkDecor';
import { useHashPath } from '../../hooks/useHashPath';
import { sectionFromPath } from '../../navigation/sections';

/**
 * Cabeçalho de página: anotação a nanquim, título sobre uma pincelada de tinta, um bloco opcional à direita
 * e a pincelada que fecha o cabeçalho. A tinta é a da aba aberta; `pigment` troca a cor.
 */
export default function SectionHeading({ caption, title, note, aside, pigment }) {
  const sectionPigment = sectionFromPath(useHashPath()).pigment;
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-end">
        <div>
          <p className="font-hand text-xl leading-none text-[#785132]">{caption}</p>
          <h2 className="relative isolate mt-2 inline-block font-serif text-[1.75rem] font-black leading-tight tracking-tight text-[#2A2421] sm:text-4xl">
            <BrushHighlight color={pigment ?? sectionPigment} />
            {title}
          </h2>
          {note && <p className="mt-1.5 max-w-prose text-sm text-[#785132]">{note}</p>}
        </div>
        {aside && <div className="self-start sm:self-auto">{aside}</div>}
      </div>
      <InkRule className="mt-3" />
    </div>
  );
}

// Selo de tinta: contorno a nanquim e o texto em serifa, levemente torto como um carimbo.
export const HEADING_PILL_CLASS =
  'inline-flex -rotate-1 items-center gap-1.5 rounded-full border-[1.5px] border-[#2A2421]/75 bg-[#FFFEFB] px-3.5 py-1.5 font-serif text-[13px] font-semibold italic leading-none text-[#5C4033] shadow-[2px_2px_0_rgba(42,36,33,0.2)]';
