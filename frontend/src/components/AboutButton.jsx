import { memo } from 'react';
import { Info } from 'lucide-react';

/** "Sobre" no header: um link de texto, sem caixa (abre o modal Sobre). */
function AboutButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Sobre a Smearglepedia"
      className="header-text-link"
    >
      <Info className="header-action-icon h-4 w-4" aria-hidden="true" />
      <span className="header-action-label">Sobre</span>
    </button>
  );
}

export default memo(AboutButton);
