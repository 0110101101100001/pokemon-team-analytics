import { memo } from 'react';

const HEART_PATH = 'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.4 4c2 0 3.6 1.1 4.6 2.7C13 5.1 14.6 4 16.6 4c3.5 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4z';

/**
 * Coração: traço firme de tinta, sem caixa, mais forte que a balança de comparar (é a ação principal do card).
 * Favoritado, cheio do --secondary do tema (a cor reservada a ícones e ao coração).
 */
function CardHeart({ active }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-6 w-6 transition-colors ${active ? 'text-secondary' : 'text-ink group-hover/fav:text-secondary'}`}
    >
      <path d={HEART_PATH} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}

const VARIANTS = {
  // No topo do card da Pokédex, por cima do botão que abre a ficha.
  card: {
    className: 'group/fav h-10 w-10 rounded-[3px]',
    Icon: CardHeart,
  },
  // No cabeçalho da ficha, ao lado de shiny e cry: retângulo de contorno, como as outras ações.
  header: {
    className: 'group/fav h-9 w-9 rounded-[3px] border-[1.5px] border-ink/60 hover:border-ink hover:bg-paper-2',
    Icon: CardHeart,
  },
};

/** `name` volta em `onToggle(name)`, para o pai usar um único callback estável para todos os cards. */
function FavoriteButton({ name, label, active, onToggle, variant = 'card', className = '' }) {
  const { className: variantClass, Icon } = VARIANTS[variant];
  return (
    <button
      type="button"
      onClick={() => onToggle(name)}
      aria-pressed={active}
      aria-label={active ? `Remover ${label} dos favoritos` : `Favoritar ${label}`}
      title={active ? 'Remover dos favoritos' : 'Favoritar'}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${variantClass} ${className}`}
    >
      <Icon active={active} />
    </button>
  );
}

export default memo(FavoriteButton);
