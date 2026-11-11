import { memo } from 'react';
import { Swords } from 'lucide-react';

function TeamBuilderButton({ onClick, count = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Team Builder"
      className="inline-flex h-10 items-center gap-2 rounded-pill border border-[#F7F3EE]/30 bg-[#3E2A1F]/90 px-3 sm:px-4 font-serif text-xs font-semibold tracking-wide text-[#F7F3EE] shadow-inner transition-colors hover:border-[#F7F3EE]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70"
    >
      <Swords className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Team Builder</span>
      {count > 0 && (
        <span className="rounded-pill bg-[#A4C294] px-1.5 font-sans text-[10px] font-bold tabular-nums text-[#2A1C14]">{count}</span>
      )}
    </button>
  );
}

export default memo(TeamBuilderButton);
