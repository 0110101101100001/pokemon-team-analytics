import { EXCLUSIVE_Z_MOVES, GENERIC_Z_MOVES } from '../data/zMoves';
import { MAX_MOVES } from '../data/maxMoves';

// Golpes Z e Max na calculadora: o golpe de dano vira o Z ou o Max do tipo que tem na batalha (poweredType, em
// utils/damage), com o poder do golpe original pela tabela oficial,
// um acerto só, sem os efeitos e os bônus do golpe original (recuo, quedas de atributo, Iron Fist…).

export const POWERED_MODES = { z: 'Z', max: 'Max' };

// [poder mínimo do golpe base, poder resultante], do maior para o menor.
const Z_POWER = [[140, 200], [130, 195], [120, 190], [110, 185], [100, 180], [90, 175], [80, 160], [70, 140], [60, 120], [0, 100]];
// { poder: [golpes] } → { golpe: poder }.
const byMove = (groups) => Object.fromEntries(
  Object.entries(groups).flatMap(([power, slugs]) => slugs.map((slug) => [slug, Number(power)])),
);
// Poder Z próprio, fora da tabela. Sem exceção, um golpe sem poder fixo vira 100.
const Z_EXCEPTIONS = byMove({
  100: ['pika-papow', 'veevee-volley'],
  120: ['mega-drain', 'spike-cannon', 'triple-kick', 'triple-axel'],
  140: [
    'pin-missile', 'bone-rush', 'magnitude', 'bullet-seed', 'icicle-spear', 'rock-blast', 'double-hit', 'tail-slap',
    'core-enforcer', 'scale-shot', 'surging-strikes',
  ],
  160: [
    'low-kick', 'flail', 'reversal', 'return', 'frustration', 'endeavor', 'weather-ball', 'gyro-ball', 'natural-gift',
    'trump-card', 'punishment', 'grass-knot', 'heavy-slam', 'electro-ball', 'stored-power', 'hex', 'heat-crash',
    'power-trip', 'terrain-pulse',
  ],
  170: ['flying-press'],
  180: [
    'guillotine', 'horn-drill', 'fissure', 'sheer-cold', 'final-gambit', 'gear-grind', 'thousand-arrows',
    'double-iron-bash', 'tachyon-cutter',
  ],
  185: ['lands-wrath', 'multi-attack'],
  190: ['wring-out', 'crush-grip'],
  220: ['v-create'],
});

const MAX_POWER = [[150, 150], [110, 140], [75, 130], [65, 120], [55, 110], [45, 100], [0, 90]];
// Lutador e Venenoso têm golpes Max mais fracos (os efeitos de aumentar atributos compensam).
const MAX_POWER_WEAK = [[150, 100], [110, 95], [75, 90], [65, 85], [55, 80], [45, 75], [0, 70]];
const WEAK_MAX_TYPES = new Set(['fighting', 'poison']);

// Poder Max próprio, pela mesma regra.
const MAX_EXCEPTIONS = byMove({
  75: ['counter', 'seismic-toss'],
  80: ['double-kick', 'triple-kick'],
  95: ['multi-attack'],
  100: ['comet-punch', 'twineedle', 'fury-swipes', 'pika-papow', 'veevee-volley', 'ruination', 'comeuppance'],
  120: ['spike-cannon', 'double-hit'],
  130: [
    'guillotine', 'horn-drill', 'fissure', 'sheer-cold', 'pin-missile', 'bonemerang', 'bone-rush', 'bullet-seed',
    'icicle-spear', 'rock-blast', 'dual-chop', 'tail-slap', 'gear-grind', 'dragon-darts', 'scale-shot', 'dual-wingbeat',
    'surging-strikes', 'flail', 'endeavor', 'weather-ball', 'terrain-pulse', 'gyro-ball', 'natural-gift', 'trump-card',
    'punishment', 'grass-knot', 'heavy-slam', 'electro-ball', 'stored-power', 'heat-crash', 'power-trip',
  ],
  140: ['magnitude', 'wring-out', 'crush-grip', 'double-iron-bash', 'rising-voltage', 'triple-axel', 'tachyon-cutter'],
});
const NO_FIXED_POWER = 100;
// Um golpe Z ou Max não herda nenhum efeito do original.
const NO_EFFECTS = {
  target: 'selected-pokemon', category: null, statChanges: [], statChance: 0,
  ailment: null, ailmentChance: 0, healing: 0, drain: 0, flinchChance: 0,
};

const fromTable = (table, power) => table.find(([minimum]) => power >= minimum)[1];
const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const Z_BY_TYPE = new Map(GENERIC_Z_MOVES.map((move) => [move.type, move.name]));
const MAX_BY_TYPE = new Map(MAX_MOVES.filter((move) => move.name !== 'Max Guard').map((move) => [move.type, move.name]));

// Struggle e os golpes que já são Z ou Max não se convertem. A PokéAPI separa os Z genéricos em --physical e --special.
const NOT_CONVERTIBLE = new Set([
  'struggle',
  ...[...GENERIC_Z_MOVES, ...EXCLUSIVE_Z_MOVES, ...MAX_MOVES].map((move) => slugOf(move.name.replace(/'/g, ''))),
]);

/** Poder do golpe Z a partir do golpe base. */
export const zPower = (move) => Z_EXCEPTIONS[move.slug] ?? (move.power ? fromTable(Z_POWER, move.power) : NO_FIXED_POWER);

/** Poder do golpe Max a partir do golpe base. */
export function maxPower(move) {
  if (MAX_EXCEPTIONS[move.slug]) return MAX_EXCEPTIONS[move.slug];
  if (!move.power) return NO_FIXED_POWER;
  return fromTable(WEAK_MAX_TYPES.has(move.type) ? MAX_POWER_WEAK : MAX_POWER, move.power);
}

/** Todo golpe de dano vira Z ou Max, mesmo os de poder variável e de dano fixo. */
export const canPowerUp = (move) => Boolean(move && move.damageClass !== 'status' && !NOT_CONVERTIBLE.has(move.slug.split('--')[0]));

/**
 * O golpe como Z (`mode` 'z'), Max ('max') ou G-Max ('gmax'): nome e slug do golpe novo, poder convertido e um acerto.
 * O G-Max (`gmaxMove`, de data/gmaxMoves) só substitui o golpe do mesmo tipo; nos outros tipos o golpe vira o Max.
 * `type` é o tipo na batalha (poweredType); o poder sai sempre do golpe original.
 * `poweredFrom` guarda o slug original para a interface; `powerUp`, o necessário para converter de novo.
 */
export function poweredMove(move, mode, gmaxMove = null, type = move?.type) {
  if (!mode || !canPowerUp(move)) return move;
  const powerUp = { move, mode, gmaxMove };
  const converted = { ...move, type, powerUp, effects: NO_EFFECTS, effectChance: null, minHits: null, maxHits: null };
  if (mode === 'gmax' && gmaxMove?.type === type) {
    return {
      ...converted,
      slug: slugOf(gmaxMove.name),
      name: gmaxMove.name,
      power: gmaxMove.power ?? maxPower(move),
      effect: gmaxMove.effect,
      powered: 'gmax',
      poweredFrom: move.slug,
    };
  }
  const kind = mode === 'z' ? 'z' : 'max';
  const name = (kind === 'z' ? Z_BY_TYPE : MAX_BY_TYPE).get(type);
  return {
    ...converted,
    slug: slugOf(name),
    name,
    power: kind === 'z' ? zPower(move) : maxPower(move),
    powered: kind,
    poweredFrom: move.slug,
  };
}
