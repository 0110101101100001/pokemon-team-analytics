import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { HeaderContext } from './headerContext';

/**
 * Filtros da seção ativa, desenhados dentro do header. Cada seção monta os seus; ao trocar de aba
 * a seção sai da tela e leva os filtros junto, então uma aba nunca mostra os filtros de outra.
 */
export default function HeaderToolbar({ children }) {
  const { slot } = useContext(HeaderContext);
  return slot ? createPortal(children, slot) : null;
}

export function ToolbarRow({ children }) {
  return (
    <div className="rounded-2xl border border-[#F7F3EE]/15 bg-[#2A1C14]/20 p-1.5 shadow-inner">
      <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">{children}</div>
    </div>
  );
}
