import { memo, useState } from 'react';
import { Scale } from 'lucide-react';

/**
 * Balança no topo do card da Pokédex: põe ou tira o Pokémon da comparação. Com a comparação cheia (e ele fora),
 * fica desativada. O ícone dá um pulo a cada toque. Mais discreta que o coração (70% de opacidade, inteira no
 * hover, no foco e quando ativa); a área de toque é de 40 × 40.
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
      className={`inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[3px] transition-[color,opacity,background-color] focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-paint-cobalt disabled:cursor-not-allowed disabled:!opacity-40 ${
        active ? 'bg-paint-cobalt/15 text-paint-cobalt' : 'text-ink opacity-70 hover:text-paint-cobalt hover:opacity-100'
      } ${className}`}
    >
      <span key={bumps} className={bumps ? 'animate-bubble-pop motion-reduce:animate-none' : ''}>
        <Scale className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 1.9} aria-hidden="true" />
      </span>
    </button>
  );
}

export default memo(CompareCardButton);
