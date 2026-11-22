import { NATURAL_GIFT } from '../data/battleModifiers';
import { DRIVE_TYPES, MEMORY_TYPES, PLATE_TYPES } from '../data/formItems';

/*
  Golpes sem poder fixo na PokéAPI, porque ele depende da batalha.
  - Poder variável: cada regra devolve { power, note } (a nota explica de onde veio o número) ou { reason }.
  - Dano fixo (Seismic Toss, Super Fang, Counter, OHKO…): o dano sai direto, sem a fórmula; { rolls, note } ou { reason }.
  Lado: { level, types, stats, boosts, weight (kg), currentHp, ivs, baseStats, lastHit, bide }.
  `lastHit` é o último golpe que o lado recebeu ({ damage, category }) e `bide` o Bide em curso ({ turns, stored }),
  ambos anotados ao passar o turno.
*/

const HIDDEN_POWER_TYPES = [
  'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel',
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark',
];
const HIDDEN_POWER_BITS = ['hp', 'atk', 'def', 'spe', 'spa', 'spd'];

/** Tipo do Hidden Power pelos IVs (bit menos significativo de cada um, na ordem do jogo). */
export function hiddenPowerType(ivs) {
  const bits = HIDDEN_POWER_BITS.reduce((total, key, index) => total + ((ivs[key] ?? 31) % 2) * 2 ** index, 0);
  return HIDDEN_POWER_TYPES[Math.floor((bits * 15) / 63)];
}

// [limite, poder]: o primeiro limite que o valor não alcança decide o poder.
const TARGET_WEIGHT = [[10, 20], [25, 40], [50, 60], [100, 80], [200, 100], [Infinity, 120]];
// Razão peso do usuário / peso do alvo: [mínimo, poder], do maior para o menor.
const WEIGHT_RATIO = [[5, 120], [4, 100], [3, 80], [2, 60], [0, 40]];
const SPEED_RATIO = [[4, 150], [3, 120], [2, 80], [1, 60], [0, 40]];
// Flail e Reversal: p = ⌊48 × PS atuais / PS máximos⌋; p até 1 dá 200, até 4 dá 150, e assim por diante.
const FLAIL = [[2, 200], [5, 150], [10, 100], [17, 80], [33, 40], [Infinity, 20]];

const below = (table, value) => table.find(([limit]) => value < limit)[1];
const atLeast = (table, value) => table.find(([minimum]) => value >= minimum)[1];

// Fling com os itens da calculadora (as Berries valem 10); Air Balloon não pode ser arremessado.
const FLING_POWER = {
  'choice-band': 10, 'choice-specs': 10, 'choice-scarf': 10, 'expert-belt': 10, 'muscle-band': 10, 'wise-glasses': 10,
  leftovers: 10, 'silk-scarf': 10, 'silver-powder': 10, 'fairy-feather': 10,
  'life-orb': 30, 'black-sludge': 30, 'booster-energy': 30, 'mystic-water': 30, 'miracle-seed': 30, 'never-melt-ice': 30,
  'black-belt': 30, 'soft-sand': 30, 'twisted-spoon': 30, 'spell-tag': 30, 'black-glasses': 30, 'metal-coat': 30,
  eviolite: 40, 'sharp-beak': 50, 'poison-barb': 70, 'dragon-fang': 70,
  'assault-vest': 80, 'heavy-duty-boots': 80, 'safety-goggles': 80, 'hard-stone': 100,
};
function flingPower(item) {
  if (PLATE_TYPES[item]) return 90;
  if (DRIVE_TYPES[item]) return 70;
  if (MEMORY_TYPES[item]) return 50;
  return FLING_POWER[item] ?? (NATURAL_GIFT[item] ? 10 : null);
}

/** PS atuais do lado: `currentHp` quando a batalha já tirou algum; senão, cheio. */
export const currentHp = (side) => Math.min(side.stats.hp, Math.max(0, side.currentHp ?? side.stats.hp));
const hpNote = (who, side) => `${who} com ${currentHp(side)}/${side.stats.hp} PS`;
const positiveBoosts = (boosts) => Object.values(boosts).reduce((total, stage) => total + Math.max(0, stage), 0);
const kg = (weight) => `${weight.toLocaleString('pt-BR')} kg`;
const berryName = (slug) => slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const needWeight = { reason: 'Falta o peso dos Pokémon para calcular o poder.' };

const RULES = {
  'grass-knot': targetWeight,
  'low-kick': targetWeight,
  'heavy-slam': relativeWeight,
  'heat-crash': relativeWeight,
  'gyro-ball': ({ attackerSpeed, defenderSpeed }) => {
    const power = attackerSpeed ? Math.min(150, Math.floor((25 * defenderSpeed) / attackerSpeed) + 1) : 1;
    return { power, note: `velocidade ${attackerSpeed} contra ${defenderSpeed}` };
  },
  'electro-ball': ({ attackerSpeed, defenderSpeed }) => {
    const ratio = defenderSpeed ? attackerSpeed / defenderSpeed : Infinity;
    return { power: atLeast(SPEED_RATIO, ratio), note: `velocidade ${attackerSpeed} contra ${defenderSpeed}` };
  },
  eruption: userHpScaled,
  'water-spout': userHpScaled,
  flail: userHpBands,
  reversal: userHpBands,
  'crush-grip': targetHpScaled,
  'wring-out': targetHpScaled,
  // Hard Press: até 100, proporcional aos PS atuais do alvo.
  'hard-press': ({ defender }) => {
    const power = Math.max(1, Math.floor((100 * currentHp(defender)) / defender.stats.hp));
    return { power, note: hpNote('alvo', defender) };
  },
  'hidden-power': () => ({ power: 60, note: 'tipo pelos IVs' }),
  'stored-power': ({ attacker }) => {
    const stages = positiveBoosts(attacker.boosts);
    return { power: 20 + 20 * stages, note: `${stages} estágio(s) positivo(s) do usuário` };
  },
  punishment: ({ defender }) => {
    const stages = positiveBoosts(defender.boosts);
    return { power: Math.min(200, 60 + 20 * stages), note: `${stages} estágio(s) positivo(s) do alvo` };
  },
  magnitude: () => ({ power: 70, note: 'Magnitude 7, a mais provável (30%)' }),
  present: () => ({ power: 40, note: 'o resultado mais provável (40%); pode ser 80, 120 ou curar' }),
  'trump-card': () => ({ power: 40, note: 'com o PP cheio' }),
  'spit-up': () => ({ power: 100, note: 'com 1 Stockpile (200 com 2, 300 com 3)' }),
  'beat-up': ({ attacker }) => (attacker.baseStats
    ? { power: Math.floor(attacker.baseStats.atk / 10) + 5, note: 'só o usuário ataca (Atk base / 10 + 5)' }
    : { reason: 'Faltam os atributos base do usuário.' }),
  fling: ({ attackerItem }) => {
    if (!attackerItem) return { reason: 'Fling falha sem item.' };
    const power = flingPower(attackerItem);
    return power ? { power, note: 'pelo item arremessado' } : { reason: 'Este item não pode ser arremessado com Fling.' };
  },
  'natural-gift': ({ attackerItem }) => {
    const berry = NATURAL_GIFT[attackerItem];
    return berry
      ? { power: berry.power, note: `${berryName(attackerItem)}, tipo ${berry.type}` }
      : { reason: 'Natural Gift falha sem uma Berry no item.' };
  },
};

function targetWeight({ defender }) {
  if (!defender.weight) return needWeight;
  return { power: below(TARGET_WEIGHT, defender.weight), note: `alvo com ${kg(defender.weight)}` };
}

function relativeWeight({ attacker, defender }) {
  if (!attacker.weight || !defender.weight) return needWeight;
  return { power: atLeast(WEIGHT_RATIO, attacker.weight / defender.weight), note: `${kg(attacker.weight)} contra ${kg(defender.weight)}` };
}

function userHpScaled({ attacker }) {
  const power = Math.max(1, Math.floor((150 * currentHp(attacker)) / attacker.stats.hp));
  return { power, note: hpNote('usuário', attacker) };
}

function userHpBands({ attacker }) {
  const p = Math.floor((48 * currentHp(attacker)) / attacker.stats.hp);
  return { power: below(FLAIL, p), note: hpNote('usuário', attacker) };
}

function targetHpScaled({ defender }) {
  const power = Math.max(1, Math.floor((120 * currentHp(defender)) / defender.stats.hp));
  return { power, note: hpNote('alvo', defender) };
}

/** Golpes cujo poder a calculadora sabe resolver. */
export const VARIABLE_POWER_MOVES = new Set(Object.keys(RULES));

/**
 * Poder do golpe na batalha: { power, note } ou { reason } se falta um dado ou o golpe não tem regra.
 * Contexto: { attacker, defender, attackerSpeed, defenderSpeed, attackerItem }.
 */
export function variablePower(move, context) {
  const rule = RULES[move.slug];
  return rule ? rule(context) : { reason: 'A calculadora ainda não sabe o poder deste golpe.' };
}

/* ---------------------------------------------------------------- dano fixo */

const OHKO_MOVES = new Set(['fissure', 'guillotine', 'horn-drill', 'sheer-cold']);
const same = (damage) => Array(16).fill(damage);
const byLevel = ({ attacker }) => ({ rolls: same(attacker.level), note: `dano igual ao nível (${attacker.level})` });
const halfOfTarget = ({ defender }) => ({ rolls: same(Math.max(1, Math.floor(currentHp(defender) / 2))), note: 'metade dos PS atuais do alvo' });

// Devolvem o dano recebido: [categoria exigida (null = qualquer), multiplicador, nome, o que precisa ter recebido].
const COUNTERS = {
  counter: ['physical', 2, 'Counter', 'um golpe físico'],
  'mirror-coat': ['special', 2, 'Mirror Coat', 'um golpe especial'],
  'metal-burst': [null, 1.5, 'Metal Burst', 'um golpe de dano'],
  comeuppance: [null, 1.5, 'Comeuppance', 'um golpe de dano'],
};

const FIXED = {
  'seismic-toss': byLevel,
  'night-shade': byLevel,
  'dragon-rage': () => ({ rolls: same(40), note: 'sempre 40 de dano' }),
  'sonic-boom': () => ({ rolls: same(20), note: 'sempre 20 de dano' }),
  // Psywave: nível × (50 a 150)%, sorteado; 16 valores espalhados pela faixa.
  psywave: ({ attacker }) => ({
    rolls: Array.from({ length: 16 }, (_, i) => Math.max(1, Math.floor((attacker.level * (50 + Math.round((i * 100) / 15))) / 100))),
    note: 'entre 50% e 150% do nível',
  }),
  'super-fang': halfOfTarget,
  ruination: halfOfTarget,
  'natures-madness': halfOfTarget,
  endeavor: ({ attacker, defender }) => {
    const damage = currentHp(defender) - currentHp(attacker);
    return damage > 0
      ? { rolls: same(damage), note: 'deixa o alvo com os PS do usuário' }
      : { reason: 'Endeavor falha: o alvo não tem mais PS que o usuário.' };
  },
  'final-gambit': ({ attacker }) => ({ rolls: same(currentHp(attacker)), note: 'os PS atuais do usuário; ele desmaia', selfFaint: true }),
  // Bide acumula o dano recebido em dois turnos e devolve o dobro no terceiro (o turno guarda `bide`).
  bide: ({ attacker }) => {
    const { bide } = attacker;
    if (!bide || bide.turns < 2) return { reason: 'Bide acumula o dano recebido por 2 turnos e devolve o dobro no 3º (use "passar o turno").' };
    if (!bide.stored) return { reason: 'Bide falha: não recebeu dano enquanto acumulava.' };
    return { rolls: same(bide.stored * 2), note: `o dobro do dano acumulado (${bide.stored})` };
  },
};

function counterDamage(slug, { attacker }) {
  const [category, multiplier, name, needs] = COUNTERS[slug];
  const hit = attacker.lastHit;
  if (!hit?.damage || (category && hit.category !== category)) {
    return { reason: `${name} só funciona depois de receber ${needs} no turno (use "passar o turno").` };
  }
  const damage = Math.max(1, Math.floor(hit.damage * multiplier));
  return { rolls: same(damage), note: `${multiplier.toLocaleString('pt-BR')}× o último golpe recebido (${hit.damage})` };
}

function ohkoDamage(slug, { attacker, defender, defenderAbility }) {
  if (defenderAbility === 'sturdy') return { reason: 'Sturdy: o alvo é imune a golpes de nocaute instantâneo.' };
  if (attacker.level < defender.level) return { reason: 'Golpes de nocaute instantâneo falham contra alvos de nível maior.' };
  if (slug === 'sheer-cold' && defender.types.includes('ice')) return { reason: 'Sheer Cold não afeta o tipo Ice.' };
  const accuracy = 30 + attacker.level - defender.level;
  return { rolls: same(currentHp(defender)), note: `nocaute se acertar (precisão de ${accuracy}%)` };
}

/** Golpes que causam dano sem a fórmula. */
export const FIXED_DAMAGE_MOVES = new Set([...Object.keys(FIXED), ...Object.keys(COUNTERS), ...OHKO_MOVES]);

/**
 * Dano de um golpe de dano fixo: { rolls, note } ou { reason }; null quando o golpe usa a fórmula normal.
 * Contexto: { attacker, defender, defenderAbility }.
 */
export function fixedDamage(move, context) {
  if (FIXED[move.slug]) return FIXED[move.slug](context);
  if (COUNTERS[move.slug]) return counterDamage(move.slug, context);
  if (OHKO_MOVES.has(move.slug)) return ohkoDamage(move.slug, context);
  return null;
}
