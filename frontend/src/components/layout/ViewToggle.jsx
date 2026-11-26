import { LayoutGrid, List } from 'lucide-react';
import { BrushUnderline } from '../InkDecor';
import { VIEWS } from '../../utils/pokedexView';

const VIEW_ICONS = { grid: LayoutGrid, list: List };

/** Grade ou Lista: dois botões com ícone e aria-pressed, no traço dos botões do header. */
export default function ViewToggle({ value, onChange, className = '' }) {
  return (
    <div role="group" aria-label="Visualização" className={`flex h-9 shrink-0 overflow-hidden rounded-[3px] border-[1.5px] border-header-ink/55 bg-header-solid sm:h-10 ${className}`}>
      {VIEWS.map((option) => {
        const Icon = VIEW_ICONS[option.value];
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={`relative inline-flex flex-1 cursor-pointer items-center justify-center text-header-ink sm:flex-none transition-colors focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-paint-pistachio/70 sm:w-10 ${
              selected ? 'bg-header-ink/20' : 'hover:bg-header-ink/10'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={selected ? 2.5 : 2} aria-hidden="true" />
            <BrushUnderline color="var(--header-underline)" active={selected} className="inset-x-2 bottom-0.5 h-[3px] w-[calc(100%-1rem)]" />
          </button>
        );
      })}
    </div>
  );
}
