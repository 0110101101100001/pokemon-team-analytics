import { createBattleSet } from '../../utils/stats';

export const MOVE_SLOTS = 4;

/**
 * Acertos que entram na conta: o número fixo do golpe (Double Kick 2) ou, nos de 2 a 5, 3
 * (a média do jogo); golpes de um acerto só, 1.
 */
export function defaultHits(move) {
  if (!move?.maxHits) return 1;
  if (move.minHits === move.maxHits) return move.maxHits;
  return Math.min(Math.max(3, move.minHits), move.maxHits);
}

/** Golpe num dos quatro espaços, com o crítico e os acertos escolhidos. */
export const createMoveSlot = (move = null) => ({ move, hits: defaultHits(move), crit: false });

export const createSide = () => ({
  pokemon: null,
  // Mega ou Primal escolhida ("charizard-mega-x"); '' = a forma normal.
  form: '',
  // Tipo Tera ativo ('' = sem Terastal; 'stellar' = Tera Stellar).
  tera: '',
  set: createBattleSet(),
  // '' = a primeira habilidade da espécie, assim que os dados chegarem.
  ability: '',
  item: '',
  status: '',
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: Array.from({ length: MOVE_SLOTS }, () => createMoveSlot()),
});

/** Lado montado a partir de um Pokémon do Team Builder: traz o set, o item e os golpes escolhidos lá. */
export function sideFromPokemon(pokemon, set = null) {
  const side = createSide();
  if (!set) return { ...side, pokemon };
  return {
    ...side,
    pokemon,
    set,
    item: set.item ?? '',
    moves: side.moves.map((slot, index) => createMoveSlot(set.moves?.[index] ?? null)),
  };
}

export const createSideConditions = () => ({
  stealthRock: false,
  spikes: 0,
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
  tailwind: false,
  protect: false,
  leechSeed: false,
});

export const createField = () => ({
  weather: '',
  terrain: '',
  magicRoom: false,
  wonderRoom: false,
  gravity: false,
  trickRoom: false,
  sides: [createSideConditions(), createSideConditions()],
});

/** O golpe como a fórmula espera, com o crítico e os acertos escolhidos no espaço. */
export function resolveSlot(slot) {
  if (!slot.move) return null;
  return { ...slot.move, category: slot.move.damageClass, hits: slot.hits, crit: slot.crit };
}
