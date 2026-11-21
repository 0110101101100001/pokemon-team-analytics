import { GENERIC_Z_MOVES } from '../data/zMoves';
import { MAX_MOVES } from '../data/maxMoves';

// Golpes Z e Max na calculadora: o golpe de dano vira o Z ou o Max do seu tipo, com o poder pela tabela oficial,
// um acerto só, sem os bônus ligados ao golpe original (Iron Fist, Technician de Knock Off…).

export const POWERED_MODES = { z: 'Z', max: 'Max' };

// [poder mínimo do golpe base, poder resultante], do maior para o menor.
const Z_POWER = [[140, 200], [130, 195], [120, 190], [110, 185], [100, 180], [90, 175], [80, 160], [70, 140], [60, 120], [0, 100]];
// Golpes com poder Z próprio, fora da tabela.
const Z_EXCEPTIONS = {
  'mega-drain': 120,
  'weather-ball': 160,
  hex: 160,
  'gear-grind': 180,
  'v-create': 220,
  'flying-press': 170,
  'core-enforcer': 140,
};

const MAX_POWER = [[150, 150], [110, 140], [75, 130], [65, 120], [55, 110], [45, 100], [0, 90]];
// Lutador e Venenoso têm golpes Max mais fracos (os efeitos de aumentar atributos compensam).
const MAX_POWER_WEAK = [[150, 100], [110, 95], [75, 90], [65, 85], [55, 80], [45, 75], [0, 70]];
const WEAK_MAX_TYPES = new Set(['fighting', 'poison']);

const fromTable = (table, power) => table.find(([minimum]) => power >= minimum)[1];
const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const Z_BY_TYPE = new Map(GENERIC_Z_MOVES.map((move) => [move.type, move.name]));
const MAX_BY_TYPE = new Map(MAX_MOVES.filter((move) => move.name !== 'Max Guard').map((move) => [move.type, move.name]));

/** Poder do golpe Z a partir do golpe base. */
export const zPower = (move) => Z_EXCEPTIONS[move.slug] ?? fromTable(Z_POWER, move.power);

/** Poder do golpe Max a partir do golpe base. */
export const maxPower = (move) => fromTable(WEAK_MAX_TYPES.has(move.type) ? MAX_POWER_WEAK : MAX_POWER, move.power);

/** Só golpes de dano com poder fixo viram Z ou Max na conta. */
export const canPowerUp = (move) => Boolean(move && move.damageClass !== 'status' && move.power);

/**
 * O golpe como Z (`mode` 'z') ou Max ('max'): nome e slug do golpe novo, poder convertido e um acerto.
 * `poweredFrom` guarda o slug original para a interface.
 */
export function poweredMove(move, mode) {
  if (!mode || !canPowerUp(move)) return move;
  const name = (mode === 'z' ? Z_BY_TYPE : MAX_BY_TYPE).get(move.type);
  return {
    ...move,
    slug: slugOf(name),
    name,
    power: mode === 'z' ? zPower(move) : maxPower(move),
    minHits: null,
    maxHits: null,
    powered: mode,
    poweredFrom: move.slug,
  };
}
