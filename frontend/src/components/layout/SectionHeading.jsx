import { BrushHighlight, InkRule } from '../InkDecor';
import { useHashPath } from '../../hooks/useHashPath';
import { sectionFromPath } from '../../navigation/sections';

/**
 * Cabeçalho de página: o título da aba sobre uma pincelada de tinta, o subtítulo logo abaixo (contagem de
 * resultados ou a descrição da aba), um bloco opcional à direita e a pincelada que fecha o cabeçalho.
 * A tinta é a da aba aberta. `rule={false}` tira a pincelada final (a Pokédex põe a barra de gerações no lugar).
 */
export default function SectionHeading({ title, subtitle, aside, rule = true, wideSubtitle = false }) {
  const pigment = sectionFromPath(useHashPath()).pigment;
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-end">
        <div>
          <h2 className="relative isolate inline-block font-serif text-[1.75rem] font-black leading-tight tracking-tight text-ink sm:text-4xl">
            <BrushHighlight color={pigment} />
            {title}
          </h2>
          {subtitle && <p className={`mt-1.5 text-sm text-brown ${wideSubtitle ? '' : 'max-w-prose'}`}>{subtitle}</p>}
        </div>
        {aside && <div className="self-start sm:self-auto">{aside}</div>}
      </div>
      {rule && <InkRule className="mt-3" wash={pigment} />}
    </div>
  );
}

/**
 * Contagem do subtítulo, igual em todas as abas: o número em destaque, a palavra no singular ou plural e, com uma
 * busca, o termo entre aspas. Ex.: <ResultCount count={3} singular="golpe" plural="golpes" query="thunder" />.
 */
export function ResultCount({ count, singular, plural, query = '' }) {
  const term = query.trim();
  return (
    <>
      <span className="font-mono font-semibold tabular-nums text-ink">{count}</span> {count === 1 ? singular : plural}
      {term && <> para <span className="font-serif italic">“{term}”</span></>}
    </>
  );
}

// Carimbo do cabeçalho: contorno ocre escuro, reto, na serifa de leitura em itálico.
export const HEADING_PILL_CLASS =
  'inline-flex items-center rounded-[2px] border-[1.5px] border-ochre-deep px-2.5 py-1 font-reading text-sm italic leading-none text-ochre-deep';
