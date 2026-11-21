import { createBattleSet } from '../../utils/stats';
import { poweredMove } from '../../utils/poweredMoves';

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

/** Golpe num dos quatro espaços, com o crítico, os acertos e o modo ('' normal, 'z', 'max' ou 'gmax') escolhidos. */
export const createMoveSlot = (move = null) => ({ move, hits: defaultHits(move), crit: false, mode: '' });

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
  // PS atuais (null = cheio), turnos de veneno forte e o último golpe recebido ({ damage, category }), que a
  // barra de PS e o botão de passar o turno atualizam. Felicidade só vale para Return e Frustration.
  currentHp: null,
  toxicTurns: 0,
  // Turnos de sono que faltam (null = 2, a média) e o Bide em curso ({ turns, stored }).
  sleepTurns: null,
  bide: null,
  lastHit: null,
  // Turnos em campo: Fake Out e First Impression só funcionam com 0.
  turnsOut: 0,
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: Array.from({ length: MOVE_SLOTS }, () => createMoveSlot()),
});

/**
 * Lado montado a partir de um Pokémon do Team Builder: traz o set, o item, a habilidade, o Tera e os golpes.
 * O Tera do set já entra ativo, como no fim do turno em que o Pokémon terastaliza.
 */
export function sideFromPokemon(pokemon, set = null) {
  const side = createSide();
  if (!set) return { ...side, pokemon };
  return {
    ...side,
    pokemon,
    set,
    item: set.item ?? '',
    ability: set.ability ?? '',
    tera: set.teraType ?? '',
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

/**
 * O golpe como a fórmula espera, com o crítico e os acertos escolhidos no espaço; como Z, Max ou G-Max, se escolhido.
 * `gmaxMove` é o G-Max do Pokémon (gmaxMoveOf), ou null se ele não tem forma Gigantamax.
 */
export function resolveSlot(slot, gmaxMove = null) {
  if (!slot.move) return null;
  const move = poweredMove(slot.move, slot.mode, gmaxMove);
  return { ...move, category: move.damageClass, hits: move.powered ? 1 : slot.hits, crit: slot.crit };
}
