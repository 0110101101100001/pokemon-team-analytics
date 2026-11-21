import { ChevronDown } from 'lucide-react';
import { thumbnailSpriteUrl } from '../../services/api';

const SELECT = 'paper-field h-9 w-full min-w-0 cursor-pointer appearance-none pl-2.5 pr-7 font-reading text-[13px]';

export function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block font-hand text-base leading-none text-umber">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>{children}</select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-umber" aria-hidden="true" />
      </span>
    </label>
  );
}

/**
 * Painel recolhível de onde o lado puxa Pokémon prontos (seus times, o time de um treinador).
 * `selected` aparece no resumo; `onOpen` roda cada vez que o painel abre.
 */
export function SourcePanel({ title, selected, defaultOpen = false, onOpen, children }) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group mt-2 rounded-[4px] border border-sepia/30 bg-page/50"
      onToggle={(e) => e.currentTarget.open && onOpen?.()}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt [&::-webkit-details-marker]:hidden">
        <span className="font-hand text-lg leading-none text-sepia">{title}</span>
        {selected && <span className="ml-auto truncate font-reading text-xs font-semibold text-sepia">{selected}</span>}
        <ChevronDown className={`h-4 w-4 shrink-0 text-umber transition-transform group-open:rotate-180 motion-reduce:transition-none ${selected ? '' : 'ml-auto'}`} aria-hidden="true" />
      </summary>
      <div className="space-y-2.5 border-t border-sepia/25 px-3 pb-3 pt-2">{children}</div>
    </details>
  );
}

/** Atalho de um Pokémon do time: sprite, com o nível embaixo quando houver; o que está em campo fica marcado. */
export function MemberShortcut({ spriteId, label, caption, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex cursor-pointer flex-col items-center rounded-[3px] border bg-paper px-1 pb-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
        active ? 'border-vermilion ring-1 ring-vermilion' : 'border-umber/25 hover:border-umber/60'
      }`}
    >
      <img src={thumbnailSpriteUrl(spriteId)} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 object-contain" />
      {caption && <span className="font-mono text-[10px] font-bold tabular-nums text-umber">{caption}</span>}
    </button>
  );
}
