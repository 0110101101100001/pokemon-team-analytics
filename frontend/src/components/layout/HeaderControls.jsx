import { ChevronDown, Search } from 'lucide-react';

export const FIELD_CLASS =
  'h-9 sm:h-10 w-full rounded-xl border border-[#F7F3EE]/30 bg-[#3E2A1F]/90 text-[#F7F3EE] [color-scheme:dark] shadow-inner transition-[border-color,box-shadow] hover:border-[#F7F3EE]/50 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25),0_0_16px_-6px_rgba(164,194,148,0.6)] focus:outline-none focus:ring-2 focus:ring-[#A4C294]/70 focus:border-[#A4C294]';
export const SELECT_CLASS = `${FIELD_CLASS} appearance-none pl-2.5 pr-7 sm:pl-3 sm:pr-9 text-xs font-serif font-semibold tracking-wide cursor-pointer`;
export const TEXT_INPUT_BASE = `${FIELD_CLASS} pl-9 text-sm font-serif placeholder:italic placeholder:text-[#F7F3EE]/70`;
export const TEXT_INPUT_CLASS = `${TEXT_INPUT_BASE} pr-3`;
export const OPTION_CLASS = 'bg-[#2A1C14] text-[#F7F3EE] font-sans';
export const ICON_CLASS = 'pointer-events-none absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#F7F3EE]/80';

/**
 * Select do header. Sem `value` é um seletor de ação: mostra o `placeholder`, dispara `onChange`
 * e quem recebe o evento devolve o campo ao vazio. Com `value` é um select controlado comum.
 */
// O placeholder é `hidden` e não `disabled`: uma opção disabled selecionada aparece em cinza.
export function HeaderSelect({ label, placeholder, value, onChange, className = 'lg:w-40 lg:shrink-0', children }) {
  const controlled = value !== undefined;
  return (
    <div className={`relative w-full ${className}`}>
      <select
        onChange={onChange}
        aria-label={label}
        className={SELECT_CLASS}
        {...(controlled ? { value } : { defaultValue: '' })}
      >
        {!controlled && <option value="" hidden>{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className={`${ICON_CLASS} right-2 sm:right-3`} aria-hidden="true" />
    </div>
  );
}

export function HeaderSearch({ label, placeholder, value, onChange, className = 'min-w-0 lg:flex-1' }) {
  return (
    <label className={`relative block w-full ${className}`}>
      <Search className={`${ICON_CLASS} left-3`} aria-hidden="true" />
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

export function HeaderSegmented({ label, options, value, onChange, className = 'sm:shrink-0' }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex h-9 rounded-xl border border-[#F7F3EE]/30 bg-[#3E2A1F]/90 p-0.5 shadow-inner sm:h-10 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`flex-1 cursor-pointer whitespace-nowrap rounded-[0.95rem] px-2.5 font-serif text-xs font-semibold tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70 sm:px-3.5 ${
              selected ? 'bg-[#A4C294] text-[#2A1C14] shadow-[0_0_14px_-2px_rgba(164,194,148,0.65)]' : 'text-[#F7F3EE]/75 hover:text-[#F7F3EE]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
