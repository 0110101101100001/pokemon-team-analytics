import { GENERATIONS } from './filters';
import { megaDebutLabel, megaGeneration } from './megas';

// Dados de /pokemon-species traduzidos para a ficha: captura, felicidade, curva de XP e classificações.

export const SPECIES_STAT_MAX = 255;

// Curvas de experiência: nome no jogo e o XP total para chegar ao nível 100.
const GROWTH_RATES = {
  'slow-then-very-fast': { label: 'Errática', xp: 600000 },
  fast: { label: 'Rápida', xp: 800000 },
  medium: { label: 'Média', xp: 1000000 },
  'medium-slow': { label: 'Média-lenta', xp: 1059860 },
  slow: { label: 'Lenta', xp: 1250000 },
  'fast-then-very-slow': { label: 'Flutuante', xp: 1640000 },
};

const HABITATS = {
  cave: 'Cavernas',
  forest: 'Florestas',
  grassland: 'Campos',
  mountain: 'Montanhas',
  rare: 'Raro',
  'rough-terrain': 'Terreno acidentado',
  sea: 'Mar',
  urban: 'Cidades',
  'waters-edge': "Beira d'água",
};

const SHAPES = {
  ball: 'Bola',
  squiggle: 'Serpentina',
  fish: 'Peixe',
  arms: 'Com braços',
  blob: 'Massa',
  upright: 'Ereta',
  legs: 'Com pernas',
  quadruped: 'Quadrúpede',
  wings: 'Com asas',
  tentacles: 'Tentáculos',
  heads: 'Várias cabeças',
  humanoid: 'Humanoide',
  'bug-wings': 'Inseto alado',
  armor: 'Armadura',
};

// `hex` só pinta a amostra ao lado do nome; tons de tinta, como o resto da ficha.
const COLORS = {
  black: { label: 'Preto', hex: '#1C1A17' },
  blue: { label: 'Azul', hex: '#4F6D8A' },
  brown: { label: 'Marrom', hex: '#8A6440' },
  gray: { label: 'Cinza', hex: '#8A8A80' },
  green: { label: 'Verde', hex: '#6E8F5A' },
  pink: { label: 'Rosa', hex: '#D48FA6' },
  purple: { label: 'Roxo', hex: '#7A5A8A' },
  red: { label: 'Vermelho', hex: '#B8402A' },
  white: { label: 'Branco', hex: '#F2EAD9' },
  yellow: { label: 'Amarelo', hex: '#D4B05A' },
};

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };

/** "generation-iv" → "4ª geração · Sinnoh"; uma geração nova na PokéAPI aparece pelo próprio nome. */
export function generationLabel(name) {
  return generationByNumber(ROMAN[name?.replace('generation-', '')]) ?? name ?? null;
}

const generationByNumber = (number) => GENERATIONS.find((generation) => Number(generation.value) === number)?.label ?? null;

const GIGANTAMAX_GENERATION = 8;

/**
 * Estreia da forma escolhida: Megas e Primais pela tabela das Megas (as de Legends: Z-A são da 9ª geração);
 * Gigantamax, 8ª; as formas da grade (regionais e outras) pela geração calculada na Pokédex (`gridGeneration`);
 * o resto, pela estreia da espécie.
 */
export function formGenerationLabel(formName, gridGeneration, speciesGeneration) {
  const megaLabel = megaDebutLabel(megaGeneration(formName));
  if (megaLabel) return megaLabel;
  const special = megaGeneration(formName) ?? (formName?.endsWith('-gmax') ? GIGANTAMAX_GENERATION : null);
  const number = special ?? gridGeneration;
  return (number && generationByNumber(number)) || generationLabel(speciesGeneration);
}

/** Quanto mais alta a taxa (0 a 255), mais fácil a captura. */
export function captureDifficulty(rate) {
  if (rate <= 3) return 'Muito difícil';
  if (rate <= 45) return 'Difícil';
  if (rate <= 120) return 'Média';
  return 'Fácil';
}

const labelOf = (table, name) => (name ? table[name] ?? name.replace(/-/g, ' ') : null);

/** Classificações especiais da espécie, na ordem em que aparecem na ficha. */
export function speciesBadges(species) {
  return [
    species.is_baby && 'Bebê',
    species.is_legendary && 'Lendário',
    species.is_mythical && 'Mítico',
  ].filter(Boolean);
}

/** Tudo o que a ficha mostra de uma espécie, já traduzido; o que a PokéAPI não tiver vem null. */
export function speciesFacts(species) {
  const growth = species.growth_rate?.name;
  return {
    captureRate: species.capture_rate ?? null,
    baseHappiness: species.base_happiness ?? null,
    growthRate: growth ? GROWTH_RATES[growth] ?? { label: growth.replace(/-/g, ' '), xp: null } : null,
    badges: speciesBadges(species),
    generation: generationLabel(species.generation?.name),
    // A PokéAPI só tem habitat até a 3ª geração.
    habitat: labelOf(HABITATS, species.habitat?.name),
    shape: labelOf(SHAPES, species.shape?.name),
    color: species.color?.name ? COLORS[species.color.name] ?? { label: species.color.name, hex: null } : null,
  };
}
