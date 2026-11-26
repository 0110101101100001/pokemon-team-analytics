import { useId } from 'react';
import { Check, Loader2, TriangleAlert } from 'lucide-react';

// Peças das abas das Configurações da conta, no mesmo traço do resto do modal.

export const SMALL_BUTTON =
  'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60';

export function PanelSection({ title, description, children, className = '' }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`border-b border-ink/15 pb-5 last:border-b-0 last:pb-0 [&+&]:pt-5 ${className}`}>
      <h3 id={id} className="font-serif text-lg font-bold text-ink">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Loading({ children = 'Molhando o pincel...' }) {
  return (
    <p className="flex items-center justify-center gap-2 py-10 italic text-umber">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {children}
    </p>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="mb-3 flex items-start gap-2 rounded-sketch border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SuccessNote({ children }) {
  if (!children) return null;
  return (
    <p role="status" className="mb-3 flex items-start gap-2 rounded-sketch border border-accent-text/40 bg-accent/10 px-3 py-2 text-sm text-accent-text">
      <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

const STATUS = {
  saving: { icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />, text: 'Salvando...', className: 'text-ink-soft' },
  saved: { icon: <Check className="h-4 w-4" aria-hidden="true" />, text: 'Salvo', className: 'text-accent-text' },
  error: { icon: <TriangleAlert className="h-4 w-4" aria-hidden="true" />, text: 'Não foi possível salvar; voltamos ao anterior.', className: 'text-danger' },
};

/** "Salvando... / Salvo / erro", como o do ícone do Perfil. */
export function SaveStatus({ status, savedText }) {
  const shown = STATUS[status];
  return (
    <p aria-live="polite" className={`flex min-h-5 items-center gap-1.5 text-sm ${shown?.className ?? ''}`}>
      {shown && shown.icon}
      {shown && (status === 'saved' && savedText ? savedText : shown.text)}
    </p>
  );
}

/** Opções lado a lado (radiogroup); as setas trocam a escolha. */
export function ChoiceGroup({ label, options, value, onChange }) {
  const labelId = useId();
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const handleKeyDown = (event) => {
    const step = keys[event.key];
    if (!step) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    event.currentTarget.querySelector(`[data-value="${CSS.escape(String(next.value))}"]`)?.focus();
  };
  return (
    <div>
      <p id={labelId} className="mb-1.5 text-sm font-semibold text-ink">{label}</p>
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={handleKeyDown} className="inline-flex flex-wrap gap-1.5">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-value={String(option.value)}
              onClick={() => onChange(option.value)}
              className={`min-h-9 cursor-pointer rounded-[3px] border-[1.5px] px-3 text-sm transition-colors ${
                checked ? 'border-accent-text bg-accent/15 font-semibold text-ink' : 'border-ink/25 text-ink-soft hover:border-ink/60 hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Chave liga/desliga com rótulo e descrição. */
export function Toggle({ label, description, checked, onChange }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-ink">{label}</label>
        {description && <p id={`${id}-desc`} className="text-sm text-ink-soft">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-[1.5px] transition-colors ${
          checked ? 'border-accent-fill bg-accent-fill' : 'border-line-strong bg-paper-2'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-4 w-4 rounded-full shadow transition-transform ${checked ? 'translate-x-[22px] bg-accent-on' : 'translate-x-[3px] bg-ink-soft'}`}
        />
      </button>
    </div>
  );
}
