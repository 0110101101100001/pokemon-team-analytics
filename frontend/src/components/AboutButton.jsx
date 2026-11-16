import { memo } from 'react';
import { Info } from 'lucide-react';
import { HEADER_BUTTON_CLASS } from './layout/HeaderControls';

function AboutButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Sobre a Smearglepedia"
      className={`${HEADER_BUTTON_CLASS} shrink-0`}
    >
      <Info className="h-4 w-4" aria-hidden="true" />
      Sobre
    </button>
  );
}

export default memo(AboutButton);
