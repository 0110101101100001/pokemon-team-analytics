// Itens que dão tipo a Judgment (Plates), Multi-Attack (Memories) e Techno Blast (Drives), e as espécies donas deles.

export const PLATE_TYPES = {
  'flame-plate': 'fire', 'splash-plate': 'water', 'zap-plate': 'electric', 'meadow-plate': 'grass',
  'icicle-plate': 'ice', 'fist-plate': 'fighting', 'toxic-plate': 'poison', 'earth-plate': 'ground',
  'sky-plate': 'flying', 'mind-plate': 'psychic', 'insect-plate': 'bug', 'stone-plate': 'rock',
  'spooky-plate': 'ghost', 'draco-plate': 'dragon', 'dread-plate': 'dark', 'iron-plate': 'steel', 'pixie-plate': 'fairy',
};

export const MEMORY_TYPES = Object.fromEntries([
  'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying',
  'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
].map((type) => [`${type}-memory`, type]));

export const DRIVE_TYPES = { 'burn-drive': 'fire', 'douse-drive': 'water', 'shock-drive': 'electric', 'chill-drive': 'ice' };

const OWNERS = { arceus: PLATE_TYPES, silvally: MEMORY_TYPES, genesect: DRIVE_TYPES };

/** Tipos de Arceus com Plate e de Silvally com Memory (nada os suprime); null nos outros casos. */
export function formTypes(species, item) {
  if (species !== 'arceus' && species !== 'silvally') return null;
  const type = OWNERS[species][item];
  return type ? [type] : null;
}

/** Se o item não sai da mão da espécie: Knock Off não ganha bônus. */
export const heldForGood = (species, item) => Boolean(OWNERS[species]?.[item]);
