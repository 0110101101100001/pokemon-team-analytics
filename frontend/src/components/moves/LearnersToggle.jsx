import { ChevronDown, Users } from 'lucide-react';
import MoveLearners from './MoveLearners';
import { formatSlug } from '../../utils/filters';

/** Botão "Pokémon" de uma linha de golpe: abre e fecha, logo abaixo, a lista de quem aprende. */
export function LearnersToggle({ move, open, panelId, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-label={`Pokémon que aprendem ${formatSlug(move)}`}
      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] border-[1.5px] border-[#1C1A17] px-2 font-reading text-[13px] font-semibold leading-none text-[#1C1A17] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt sm:px-2.5 ${
        open ? 'bg-[#E6D9BE]' : 'bg-paper hover:bg-[#E6D9BE]'
      }`}
    >
      <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="max-sm:hidden">Pokémon</span>
      <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
  );
}

/** A linha que abre sob o golpe, ocupando a largura da tabela, com a lista de quem aprende. */
export function LearnersRow({ columns, ...learnersProps }) {
  return (
    <tr className="border-b border-[#5C4033]/10 bg-[#E6D9BE]/35">
      <td colSpan={columns} className="px-3">
        <MoveLearners {...learnersProps} />
      </td>
    </tr>
  );
}
