import { Search } from 'lucide-react';
import { BrushUnderline, InkMarker } from '../InkDecor';

// Campo de papel: só o sublinhado a tinta, sem caixa. No foco o sublinhado engrossa e pega o pistache.
export const FIELD_CLASS =
  'h-9 sm:h-10 w-full rounded-none border-0 border-b-[1.5px] border-page/50 bg-transparent text-paper [color-scheme:dark] transition-[border-color,border-width] hover:border-page/85 focus:outline-none focus:border-b-[2.5px] focus:border-paint-pistachio';
export const SELECT_CLASS = `${FIELD_CLASS} appearance-none pl-1 pr-6 sm:pr-7 font-reading text-sm font-medium cursor-pointer`;
export const TEXT_INPUT_BASE = `${FIELD_CLASS} pl-7 font-reading text-[15px] placeholder:italic placeholder:text-page/75`;
// Botão do header: retângulo de contorno, como um carimbo.
export const HEADER_BUTTON_CLASS =
  'relative h-9 sm:h-10 inline-flex items-center justify-center gap-2 rounded-[3px] border-[1.5px] border-page/55 px-3 font-reading text-sm font-medium text-paper transition-colors cursor-pointer hover:bg-page/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-pistachio/70';
export const TEXT_INPUT_CLASS = `${TEXT_INPUT_BASE} pr-3`;
export const OPTION_CLASS = 'bg-ink text-page font-reading';
export const ICON_CLASS = 'pointer-events-none absolute top-1/2 -translate-y-1/2 w-4 h-4 text-page/80';

/**
 * Select do header. Sem `value` é um seletor de ação: mostra o `placeholder`, dispara `onChange`
 * e quem recebe o evento devolve o campo ao vazio. Com `value` é um select controlado comum.
 */
// O placeholder é `hidden` e não `disabled`: uma opção disabled selecionada aparece em cinza.
export function HeaderSelect({ label, placeholder, value, onChange, disabled = false, className = 'lg:w-40 lg:shrink-0', children }) {
  const controlled = value !== undefined;
  return (
    <div className={`relative w-full ${className}`}>
      <select
        onChange={onChange}
        aria-label={label}
        disabled={disabled}
        className={`${SELECT_CLASS} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-inner`}
        {...(controlled ? { value } : { defaultValue: '' })}
      >
        {!controlled && <option value="" hidden>{placeholder}</option>}
        {children}
      </select>
      <InkMarker className="pointer-events-none absolute right-1 top-1/2 h-2.5 w-3 -translate-y-1/2 text-page/90 sm:right-1.5" />
    </div>
  );
}

export function HeaderSearch({ label, placeholder, value, onChange, className = 'min-w-0 lg:flex-1' }) {
  return (
    <label className={`relative block w-full ${className}`}>
      <Search className={`${ICON_CLASS} left-1`} aria-hidden="true" />
      <input
        type="search"
        className={TEXT_INPUT_CLASS}
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}

/** Alternador do header: opções em texto, a ativa marcada por uma pincelada pistache em vez de fundo. */
export function HeaderSegmented({ label, options, value, onChange, className = 'sm:shrink-0' }) {
  return (
    <div role="group" aria-label={label} className={`flex h-9 items-stretch gap-1 sm:h-10 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`relative flex-1 cursor-pointer whitespace-nowrap px-2 font-reading text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-pistachio/70 sm:px-2.5 ${
              selected ? 'font-semibold text-paper' : 'text-page/75 hover:text-paper'
            }`}
          >
            {option.label}
            <BrushUnderline color="#A4C294" active={selected} className="inset-x-1.5 bottom-1 h-[4px] w-[calc(100%-0.75rem)]" />
          </button>
        );
      })}
    </div>
  );
}
