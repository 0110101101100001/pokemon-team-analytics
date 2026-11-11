export const TYPE_COLORS = {
  normal: { bg: 'bg-pokemon-normal/20', border: 'border-pokemon-normal/40', text: 'text-pokemon-normal', solid: 'bg-pokemon-normal text-white', dot: 'bg-pokemon-normal' },
  fire: { bg: 'bg-pokemon-fire/20', border: 'border-pokemon-fire/40', text: 'text-pokemon-fire', solid: 'bg-pokemon-fire text-white', dot: 'bg-pokemon-fire' },
  water: { bg: 'bg-pokemon-water/20', border: 'border-pokemon-water/40', text: 'text-pokemon-water', solid: 'bg-pokemon-water text-white', dot: 'bg-pokemon-water' },
  electric: { bg: 'bg-pokemon-electric/20', border: 'border-pokemon-electric/40', text: 'text-pokemon-electric', solid: 'bg-pokemon-electric text-white', dot: 'bg-pokemon-electric' },
  grass: { bg: 'bg-pokemon-grass/20', border: 'border-pokemon-grass/40', text: 'text-pokemon-grass', solid: 'bg-pokemon-grass text-white', dot: 'bg-pokemon-grass' },
  ice: { bg: 'bg-pokemon-ice/20', border: 'border-pokemon-ice/40', text: 'text-pokemon-ice', solid: 'bg-pokemon-ice text-white', dot: 'bg-pokemon-ice' },
  fighting: { bg: 'bg-pokemon-fighting/20', border: 'border-pokemon-fighting/40', text: 'text-pokemon-fighting', solid: 'bg-pokemon-fighting text-white', dot: 'bg-pokemon-fighting' },
  poison: { bg: 'bg-pokemon-poison/20', border: 'border-pokemon-poison/40', text: 'text-pokemon-poison', solid: 'bg-pokemon-poison text-white', dot: 'bg-pokemon-poison' },
  ground: { bg: 'bg-pokemon-ground/20', border: 'border-pokemon-ground/40', text: 'text-pokemon-ground', solid: 'bg-pokemon-ground text-white', dot: 'bg-pokemon-ground' },
  flying: { bg: 'bg-pokemon-flying/20', border: 'border-pokemon-flying/40', text: 'text-pokemon-flying', solid: 'bg-pokemon-flying text-white', dot: 'bg-pokemon-flying' },
  psychic: { bg: 'bg-pokemon-psychic/20', border: 'border-pokemon-psychic/40', text: 'text-pokemon-psychic', solid: 'bg-pokemon-psychic text-white', dot: 'bg-pokemon-psychic' },
  bug: { bg: 'bg-pokemon-bug/20', border: 'border-pokemon-bug/40', text: 'text-pokemon-bug', solid: 'bg-pokemon-bug text-white', dot: 'bg-pokemon-bug' },
  rock: { bg: 'bg-pokemon-rock/20', border: 'border-pokemon-rock/40', text: 'text-pokemon-rock', solid: 'bg-pokemon-rock text-white', dot: 'bg-pokemon-rock' },
  ghost: { bg: 'bg-pokemon-ghost/20', border: 'border-pokemon-ghost/40', text: 'text-pokemon-ghost', solid: 'bg-pokemon-ghost text-white', dot: 'bg-pokemon-ghost' },
  dragon: { bg: 'bg-pokemon-dragon/20', border: 'border-pokemon-dragon/40', text: 'text-pokemon-dragon', solid: 'bg-pokemon-dragon text-white', dot: 'bg-pokemon-dragon' },
  dark: { bg: 'bg-pokemon-dark/20', border: 'border-pokemon-dark/40', text: 'text-pokemon-dark', solid: 'bg-pokemon-dark text-white', dot: 'bg-pokemon-dark' },
  steel: { bg: 'bg-pokemon-steel/20', border: 'border-pokemon-steel/40', text: 'text-pokemon-steel', solid: 'bg-pokemon-steel text-white', dot: 'bg-pokemon-steel' },
  fairy: { bg: 'bg-pokemon-fairy/20', border: 'border-pokemon-fairy/40', text: 'text-pokemon-fairy', solid: 'bg-pokemon-fairy text-white', dot: 'bg-pokemon-fairy' },
};

// Cores de tinta do Smeargle para elementos decorativos
export const INK_COLORS = {
  lime: { bg: 'bg-ink-lime', text: 'text-ink-lime', border: 'border-ink-lime', glow: 'shadow-glow-lime' },
  magenta: { bg: 'bg-ink-magenta', text: 'text-ink-magenta', border: 'border-ink-magenta', glow: 'shadow-glow-magenta' },
  yellow: { bg: 'bg-ink-yellow', text: 'text-ink-yellow', border: 'border-ink-yellow', glow: 'shadow-glow-yellow' },
  purple: { bg: 'bg-ink-purple', text: 'text-ink-purple', border: 'border-ink-purple', glow: 'shadow-glow-purple' },
};

export function getTypeColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.normal;
}

export function getInkColor(name) {
  return INK_COLORS[name] || INK_COLORS.lime;
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
