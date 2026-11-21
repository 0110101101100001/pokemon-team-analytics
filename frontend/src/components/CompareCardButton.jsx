import { memo, useState } from 'react';
import { Scale } from 'lucide-react';

/**
 * Balança no topo do card da Pokédex: põe ou tira o Pokémon da comparação. Com a comparação cheia (e ele fora),
 * fica desativada. O ícone dá um pulo a cada toque.
 */
function CompareCardButton({ name, label, active, full, onToggle, className = '' }) {
  const [bumps, setBumps] = useState(0);
  const disabled = full && !active;
  return (
    <button
      type="button"
      onClick={() => {
        setBumps((count) => count + 1);
        onToggle(name);
      }}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? `Tirar ${label} da comparação` : `Comparar ${label}`}
      title={disabled ? 'A comparação já tem 4 Pokémon' : active ? 'Na comparação: toque para tirar' : 'Comparar'}
      className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[3px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-[#4F6D8A]/15 text-[#4F6D8A]' : 'text-[#1C1A17] hover:text-[#4F6D8A]'
      } ${className}`}
    >
      <span key={bumps} className={bumps ? 'animate-bubble-pop motion-reduce:animate-none' : ''}>
        <Scale className="h-[20px] w-[20px]" strokeWidth={active ? 2.75 : 2.25} aria-hidden="true" />
      </span>
    </button>
  );
}

export default memo(CompareCardButton);
