import { createBattleSet } from '../../utils/stats';
import { withMaxPower } from '../../utils/movePower';
import { effectiveMode } from '../../utils/dynamax';
import { poweredType } from '../../utils/damage';
import { poweredMove } from '../../utils/poweredMoves';

export const MOVE_SLOTS = 4;
export const MAX_RESERVES = 5;
let lastUid = 0;
// O que um golpe de status vira em Dynamax.
const MAX_GUARD = { slug: 'max-guard', name: 'Max Guard', type: 'normal', damageClass: 'status', power: null, priority: 4 };

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
  // Identidade do Pokémon no time: as trocas mudam a posição, não o uid.
  uid: (lastUid += 1),
  // Os outros Pokémon do lado, cada um como um lado sem reservas.
  bench: [],
  // De qual time veio e em qual posição ('' = escolhido à mão).
  teamKey: '',
  teamIndex: null,
  // Se já está em campo desde que a batalha começou (os hazards de entrada já foram pagos).
  entered: false,
  // Intrepid Sword e Dauntless Shield só agem uma vez por batalha.
  boostUsed: false,
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
  // barra de PS e o botão de passar o turno atualizam.
  currentHp: null,
  toxicTurns: 0,
  // Turnos de sono que faltam (null = 2, a média) e o Bide em curso ({ turns, stored }).
  sleepTurns: null,
  bide: null,
  lastHit: null,
  // Dynamax (utils/dynamax) e o que os G-Max deixam no Pokémon (utils/moveEffects).
  dynamax: 0,
  dynamaxSpent: false,
  volatiles: {},
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
    moves: side.moves.map((slot, index) => createMoveSlot(withMaxPower(set.moves?.[index] ?? null))),
  };
}

/** Lado com o time inteiro: `index` em campo, os outros nas reservas, na ordem do time. */
export function sideFromTeam({ key, index, members }) {
  const built = members.slice(0, MAX_RESERVES + 1).map(({ pokemon, set }, at) => (
    { ...sideFromPokemon(pokemon, set), teamKey: key, teamIndex: at }
  ));
  return { ...built[index], bench: built.filter((_, at) => at !== index) };
}

/** Põe a reserva `uid` em campo, sem efeitos; quem sai fica na vaga dela. */
export function swapIn(side, uid) {
  const incoming = side.bench.find((member) => member.uid === uid);
  if (!incoming) return side;
  const { bench, ...leaving } = side;
  return { ...incoming, bench: bench.map((member) => (member.uid === uid ? { ...leaving, bench: [] } : member)) };
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
  steelsurge: false,
  toxicSpikes: 0,
  stickyWeb: false,
  gmaxDamage: null,
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
 * `battle` ({ attacker, field }) decide o tipo do Z ou Max; sem ela, fica o tipo do golpe.
 */
export function resolveSlot(slot, gmaxMove = null, battle = null) {
  if (!slot.move) return null;
  const attacker = battle?.attacker;
  if (attacker?.dynamax && slot.move.damageClass === 'status') return { ...MAX_GUARD, category: 'status', hits: 1, crit: false };
  const mode = effectiveMode(slot.mode, attacker);
  const type = mode && attacker ? poweredType(slot.move, mode, attacker, battle.field) : slot.move.type;
  const move = poweredMove(slot.move, mode, gmaxMove, type);
  return { ...move, category: move.damageClass, hits: move.powered ? 1 : slot.hits, crit: slot.crit, outcome: slot.outcome };
}
