import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { HeaderContext } from './headerContext';

/**
 * Zona de controle da seção ativa, desenhada dentro do header, logo abaixo da navegação: uma faixa só
 * para a busca, os filtros e os filtros avançados. Cada seção monta os seus; ao trocar de aba
 * a seção sai da tela e leva os filtros junto, então uma aba nunca mostra os filtros de outra.
 */
export default function HeaderToolbar({ children }) {
  const { slot } = useContext(HeaderContext);
  if (!slot) return null;
  return createPortal(
    <div className="border-t border-[#F7F3EE]/25 pt-1">{children}</div>,
    slot,
  );
}

// Largura a partir da qual os controles cabem numa linha só; abaixo dela, cada grupo ocupa a sua linha.
const ROW_FROM = {
  sm: 'sm:flex-row sm:items-center sm:gap-2',
  lg: 'sm:gap-2 lg:flex-row lg:items-center',
};

export function ToolbarRow({ rowFrom = 'sm', children }) {
  return <div className={`flex w-full flex-col gap-1.5 ${ROW_FROM[rowFrom]}`}>{children}</div>;
}
