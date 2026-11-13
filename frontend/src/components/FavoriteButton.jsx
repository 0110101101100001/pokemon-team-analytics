import { memo } from 'react';
import { Heart } from 'lucide-react';

const VARIANTS = {
  // Dentro do card, que também é clicável.
  card: 'h-7 w-7 border-[#4A3B32]/15 bg-[#FFFEFB]/85 shadow-xs',
  // No cabeçalho da ficha, ao lado de shiny e cry.
  header: 'h-9 w-9 border-[#4A3B32]/20 bg-[#FFFEFB]/80',
};

/** `name` volta em `onToggle(name)`, para o pai usar um único callback estável para todos os cards. */
function FavoriteButton({ name, label, active, onToggle, variant = 'card' }) {
  // O card pai abre a ficha no clique e em Enter/Espaço; aqui os dois eventos param no botão.
  const stop = (e) => e.stopPropagation();

  return (
    <button
      type="button"
      onClick={(e) => { stop(e); onToggle(name); }}
      onKeyDown={stop}
      aria-pressed={active}
      aria-label={active ? `Remover ${label} dos favoritos` : `Favoritar ${label}`}
      title={active ? 'Remover dos favoritos' : 'Favoritar'}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${VARIANTS[variant]} ${
        active ? 'text-[#B5654A] hover:text-[#8A4A34]' : 'text-[#78614E]/70 hover:border-[#B5654A]/50 hover:text-[#B5654A]'
      }`}
    >
      {/* O contorno fica; por cima, o coração cheio sobe como tinta num pincel mergulhado. */}
      <span className={`relative h-4 w-4 transition-transform duration-300 ${active ? 'scale-110' : ''}`} aria-hidden="true">
        <Heart className="absolute inset-0 h-4 w-4" />
        <Heart
          className="absolute inset-0 h-4 w-4 fill-current transition-[clip-path] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ clipPath: active ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)' }}
        />
      </span>
    </button>
  );
}

export default memo(FavoriteButton);
