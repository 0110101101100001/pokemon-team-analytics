import { capitalize } from '../utils/typeColors';

// Cores terrosas por tipo — alinhadas com o tema de tinta/pintura do card
export const TYPE_INK = {
  grass:   { bg: '#e8eedf', border: '#829b72', text: '#3d5438' },
  fire:    { bg: '#efe3dd', border: '#b5654a', text: '#8a4a34' },
  water:   { bg: '#e4eef4', border: '#6d98b5', text: '#415c6d' },
  electric:{ bg: '#f7f1dc', border: '#d4b05a', text: '#7f682f' },
  bug:     { bg: '#edf0e2', border: '#7a8a46', text: '#4a542c' },
  normal:  { bg: '#ececea', border: '#8a8a70', text: '#535344' },
  poison:  { bg: '#eee4ee', border: '#7a4a7a', text: '#4a2d4a' },
  ground:  { bg: '#f4edda', border: '#b5904a', text: '#6d562c' },
  fairy:   { bg: '#f3e8ea', border: '#b87a8a', text: '#6e4a5a' },
  fighting:{ bg: '#efe4e2', border: '#8a4a34', text: '#532d20' },
  psychic: { bg: '#f3e5e8', border: '#b85a6a', text: '#6e3640' },
  rock:    { bg: '#efede6', border: '#8a704a', text: '#53442c' },
  ghost:   { bg: '#ece6ee', border: '#6a5a8a', text: '#40366e' },
  ice:     { bg: '#e7f4f4', border: '#7ab8b8', text: '#4a6e6e' },
  dragon:  { bg: '#efe6f3', border: '#6a4ab8', text: '#402e6e' },
  dark:    { bg: '#eeecea', border: '#6a5848', text: '#40382e' },
  steel:   { bg: '#ececef', border: '#8a8ab0', text: '#54546a' },
  flying:  { bg: '#ede7f3', border: '#8a70b8', text: '#54466e' },
};

export default function PokemonTypeBadge({ type, className }) {
  const ink = TYPE_INK[type] || TYPE_INK.normal;

  return (
    // Gota de tinta: cantos desiguais e a tinta mais carregada na borda de baixo, onde escorreu e secou.
    <span className={`inline-flex items-center gap-1 border border-b-[1.5px] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-[0.8rem_0.65rem_0.85rem_0.6rem/0.6rem_0.8rem_0.7rem_0.9rem] ${className || ''}`} style={{
      backgroundColor: ink.bg,
      borderColor: ink.border + '55',
      borderBottomColor: ink.border + '99',
      color: ink.text,
    }}>
      {capitalize(type)}
    </span>
  );
}
