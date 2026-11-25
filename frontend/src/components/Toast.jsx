import { memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, X } from 'lucide-react';

const DURATION_MS = 3200;

/**
 * Aviso rápido no pé da tela, por cima até da ficha: confirma uma ação (entrou no time, foi para a comparação)
 * e pode oferecer o passo seguinte (`action`: { label, onClick } ou { label, href }). Some sozinho.
 * `toast`: { id, message, tone: 'success' | 'info', action } ou null.
 */
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const Icon = toast?.tone === 'info' ? Info : Check;
  const { action } = toast ?? {};
  const runAction = () => {
    action.onClick?.();
    onDismiss();
  };

  return createPortal(
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex justify-center px-4 sm:bottom-24">
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-[3px] border-[1.5px] border-ink bg-paper py-2 pl-3 pr-1.5 font-reading text-sm text-ink shadow-hard animate-bubble-pop motion-reduce:animate-none"
        >
          <Icon className={`h-4 w-4 shrink-0 ${toast.tone === 'info' ? 'text-umber' : 'text-olive-ink'}`} aria-hidden="true" />
          <span className="min-w-0">{toast.message}</span>
          {action && (action.href ? (
            <a href={action.href} onClick={onDismiss} className="shrink-0 rounded-[2px] px-2 py-1 font-semibold text-vermilion underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt">
              {action.label}
            </a>
          ) : (
            <button type="button" onClick={runAction} className="shrink-0 cursor-pointer rounded-[2px] px-2 py-1 font-semibold text-vermilion underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt">
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar aviso"
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[2px] text-ink-soft transition-colors hover:bg-paper-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

export default memo(Toast);
