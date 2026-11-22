import { memo } from 'react';
import { Info } from 'lucide-react';

function AboutButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Sobre a Smearglepedia"
      className="header-paper-button"
    >
      <Info className="header-action-icon h-4 w-4" aria-hidden="true" />
      Sobre
    </button>
  );
}

export default memo(AboutButton);
