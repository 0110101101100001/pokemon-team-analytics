import Reveal from '../Reveal';
import { BrushHighlight, InkRule } from '../InkDecor';
import { useHashPath } from '../../hooks/useHashPath';
import { sectionFromPath } from '../../navigation/sections';

/**
 * Cabeçalho de página do caderno: anotação à mão, título sobre uma pincelada de aquarela,
 * um bloco opcional à direita e a linha traçada à mão fechando o cabeçalho.
 * A pincelada usa a tinta da aba aberta; `pigment` troca a cor.
 */
export default function SectionHeading({ caption, title, note, aside, pigment }) {
  const sectionPigment = sectionFromPath(useHashPath()).pigment;
  return (
    <>
      <Reveal className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-end">
        <div>
          <p className="font-hand text-xl leading-none text-[#78614E] -rotate-1">{caption}</p>
          <h2 className="relative isolate mt-1.5 inline-block font-serif text-2xl font-black tracking-tight text-[#2A2421] sm:text-[1.7rem]">
            <BrushHighlight color={pigment ?? sectionPigment} />
            {title}
          </h2>
          {note && <p className="mt-1 text-sm text-[#78614E]">{note}</p>}
        </div>
        {aside && <div className="self-start sm:self-auto">{aside}</div>}
      </Reveal>
      <Reveal delay={120}>
        <InkRule />
      </Reveal>
    </>
  );
}

// Etiqueta de nota adesiva, levemente torta, com a fita marcada no canto.
export const HEADING_PILL_CLASS =
  'relative inline-block rotate-1 rounded-[0.35rem_0.6rem_0.4rem_0.55rem] border border-[#D4B05A]/50 bg-[#FBF1C9] px-3 py-1.5 font-hand text-base font-semibold leading-none text-[#6D562C] shadow-[2px_3px_0_rgba(92,64,51,0.12)]';
