import { memo } from 'react';
import { Info } from 'lucide-react';

function AboutButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Sobre a Smearglepedia"
      title="Sobre"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-[#F7F3EE]/30 bg-[#3E2A1F]/90 text-[#F7F3EE] shadow-inner transition-colors hover:border-[#F7F3EE]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70"
    >
      <Info className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export default memo(AboutButton);
