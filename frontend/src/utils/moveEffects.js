import { effectiveness } from './typeChart';

/*
  Efeitos de um golpe no turno simulado, a partir do que a PokéAPI publica (services/api.js → moveEffectsOf):
  estágios, status, cura, dreno e recuo, Leech Seed, e os golpes que mudam o campo (clima, terreno, telas, salas,
  hazards). Só entram os efeitos certos (chance 0 ou 100): a simulação usa o resultado médio, não sorteia.
  `battle` é o estado mutável do turno: { combatants, hp, boosts, status, toxicTurns, sleepTurns, conditions, field }.
*/

export const PROTECT_MOVES = new Set([
  'protect', 'detect', 'kings-shield', 'spiky-shield', 'baneful-bunker', 'obstruct', 'silk-trap', 'burning-bulwark', 'max-guard',
]);
const POWDER_MOVES = new Set(['spore', 'sleep-powder', 'stun-spore', 'poison-powder']);
// Alvos que são o próprio usuário ou o lado dele: os estágios de um golpe de status vão para quem o usa.
const SELF_TARGETS = new Set(['user', 'users-field', 'user-and-allies', 'user-or-ally', 'ally', 'all-allies']);
const STAT_GUARDS = new Set(['clear-body', 'white-smoke', 'full-metal-body']);
const MAIN_STATUSES = new Set(['paralysis', 'sleep', 'freeze', 'burn', 'poison']);
// Sono: os jogos sorteiam de 1 a 3 turnos sem agir; a simulação usa 2, a média (Rest dorme sempre 2).
export const SLEEP_TURNS = 2;

const WEATHER_MOVES = { 'sunny-day': 'sun', 'rain-dance': 'rain', sandstorm: 'sand', snowscape: 'snow', hail: 'snow' };
const TERRAIN_MOVES = { 'electric-terrain': 'electric', 'grassy-terrain': 'grassy', 'misty-terrain': 'misty', 'psychic-terrain': 'psychic' };
const USER_SIDE_MOVES = { reflect: 'reflect', 'light-screen': 'lightScreen', 'aurora-veil': 'auroraVeil', tailwind: 'tailwind' };
// Trick Room, Gravity e as salas: usar de novo desfaz.
const ROOM_MOVES = { 'trick-room': 'trickRoom', gravity: 'gravity', 'magic-room': 'magicRoom', 'wonder-room': 'wonderRoom' };
const WEATHER_HEAL = new Set(['moonlight', 'synthesis', 'morning-sun']);

/** Golpes que mudam o campo (clima, terreno, telas, salas, hazards): o registro os mostra com o ícone de campo. */
export const isFieldMove = (slug) => Boolean(WEATHER_MOVES[slug] || TERRAIN_MOVES[slug] || USER_SIDE_MOVES[slug] || ROOM_MOVES[slug])
  || slug === 'stealth-rock' || slug === 'spikes';

const STAT_LABELS = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
const STATUS_LABELS = { paralysis: 'paralisado', sleep: 'dormindo', freeze: 'congelado', burn: 'queimado', poison: 'envenenado', toxic: 'muito envenenado' };
const WEATHER_LABELS = { sun: 'sol', rain: 'chuva', sand: 'tempestade de areia', snow: 'neve' };
const TERRAIN_LABELS = { electric: 'Electric Terrain', grassy: 'Grassy Terrain', misty: 'Misty Terrain', psychic: 'Psychic Terrain' };
const ROOM_LABELS = { trickRoom: 'Trick Room', gravity: 'Gravity', magicRoom: 'Magic Room', wonderRoom: 'Wonder Room' };

const signed = (value) => (value > 0 ? `+${value}` : `−${-value}`);

/** Cura `amount` PS, sem passar do máximo; devolve quanto curou. */
function heal(battle, index, amount) {
  const max = battle.combatants[index].stats.hp;
  const healed = Math.max(0, Math.min(amount, max - battle.hp[index]));
  battle.hp[index] += healed;
  return healed;
}

/** Motivo de o alvo não receber o status, ou null se recebe. */
function statusBlocked(battle, index, status, move) {
  const target = battle.combatants[index];
  const { types } = target;
  if (battle.status[index]) return `${STATUS_LABELS[battle.status[index]] ?? 'com status'}, não recebe outro`;
  if (battle.field.terrain === 'misty' && !types.includes('flying')) return 'Misty Terrain protege de status';
  if (POWDER_MOVES.has(move.slug) && types.includes('grass')) return 'o tipo Grass é imune a pós';
  if (move.slug === 'thunder-wave' && effectiveness('electric', types) === 0) return 'imune a Thunder Wave';
  if (status === 'burn' && types.includes('fire')) return 'o tipo Fire não se queima';
  if ((status === 'poison' || status === 'toxic') && (types.includes('poison') || types.includes('steel'))) return 'imune a veneno';
  if (status === 'paralysis' && types.includes('electric')) return 'o tipo Electric não fica paralisado';
  if (status === 'freeze' && types.includes('ice')) return 'o tipo Ice não congela';
  if (status === 'sleep' && battle.field.terrain === 'electric') return 'Electric Terrain impede o sono';
  return null;
}

/** Muda os estágios de `index`; Contrary inverte, Simple dobra, Clear Body barra quedas vindas do oponente. */
function changeStages(battle, index, changes, fromOpponent) {
  const { ability } = battle.combatants[index];
  const applied = [];
  for (const { stat, change } of changes) {
    let delta = ability === 'contrary' ? -change : change;
    if (ability === 'simple') delta *= 2;
    if (delta < 0 && fromOpponent && STAT_GUARDS.has(ability)) continue;
    const before = battle.boosts[index][stat];
    const after = Math.max(-6, Math.min(6, before + delta));
    if (after === before) continue;
    battle.boosts[index] = { ...battle.boosts[index], [stat]: after };
    applied.push(`${STAT_LABELS[stat]} ${signed(after - before)}`);
  }
  return applied;
}

const isCertain = (chance) => chance === 0 || chance >= 100;

/**
 * Aplica os efeitos do golpe que `from` acabou de usar em `to`. `damage` é o dano causado (0 nos de status).
 * Devolve as frases do registro (sem o nome de quem usou).
 */
export function applyMoveEffects(battle, { from, to, move, damage, names }) {
  const effects = move.effects;
  const notes = [];
  const user = battle.combatants[from];
  const isStatusMove = move.category === 'status';
  if (!effects) return isStatusMove ? ['efeito desconhecido (golpe sem dados da PokéAPI)'] : notes;

  // Cura do usuário (Recover, Roost; Moonlight e afins dependem do clima; Rest dorme).
  if (move.slug === 'rest') {
    if (battle.hp[from] === user.stats.hp) return ['falhou: os PS já estão cheios'];
    const healed = heal(battle, from, user.stats.hp);
    battle.status[from] = 'sleep';
    battle.sleepTurns[from] = SLEEP_TURNS;
    battle.toxicTurns[from] = 0;
    return [`+${healed} PS e dorme por ${SLEEP_TURNS} turnos`];
  }
  if (effects.healing > 0 && isStatusMove) {
    let fraction = effects.healing / 100;
    if (WEATHER_HEAL.has(move.slug) && battle.field.weather) fraction = ['sun', 'harsh-sun'].includes(battle.field.weather) ? 2 / 3 : 1 / 4;
    const healed = heal(battle, from, Math.floor(user.stats.hp * fraction));
    notes.push(healed ? `+${healed} PS` : 'os PS já estão cheios');
  }

  // Dreno (Giga Drain, Drain Punch) e recuo (Double-Edge, Brave Bird).
  if (damage > 0 && effects.drain > 0) {
    const healed = heal(battle, from, Math.max(1, Math.floor((damage * effects.drain) / 100)));
    if (healed) notes.push(`recupera ${healed} PS`);
  } else if (damage > 0 && effects.drain < 0 && !['rock-head', 'magic-guard'].includes(user.ability)) {
    const recoil = Math.min(battle.hp[from], Math.max(1, Math.floor((damage * -effects.drain) / 100)));
    battle.hp[from] -= recoil;
    notes.push(`perde ${recoil} PS de recuo`);
  }

  // Estágios: golpes de dano que sobem os do usuário (ou baixam, como Close Combat) e os que baixam os do alvo.
  if (effects.statChanges.length && (isStatusMove || damage > 0) && isCertain(effects.statChance)) {
    const toUser = effects.category === 'damage+raise' || (effects.category !== 'damage+lower' && SELF_TARGETS.has(effects.target));
    const index = toUser ? from : to;
    const applied = changeStages(battle, index, effects.statChanges, !toUser);
    if (applied.length) notes.push(`${toUser ? '' : `${names[to]}: `}${applied.join(', ')}`);
    else if (isStatusMove) notes.push('os estágios já estão no limite');
  }

  // Status e Leech Seed.
  if (effects.ailment && (isStatusMove || damage > 0) && isCertain(effects.ailmentChance)) {
    const ailment = move.slug === 'toxic' ? 'toxic' : effects.ailment;
    if (ailment === 'leech-seed') {
      if (battle.combatants[to].types.includes('grass')) notes.push('falhou: o tipo Grass é imune a Leech Seed');
      else {
        battle.conditions[to] = { ...battle.conditions[to], leechSeed: true };
        notes.push(`${names[to]} foi semeado`);
      }
    } else if (MAIN_STATUSES.has(ailment) || ailment === 'toxic') {
      const blocked = statusBlocked(battle, to, ailment, move);
      if (blocked) notes.push(`falhou: ${names[to]} ${blocked}`);
      else {
        battle.status[to] = ailment;
        battle.toxicTurns[to] = 0;
        if (ailment === 'sleep') battle.sleepTurns[to] = SLEEP_TURNS;
        notes.push(`${names[to]} ficou ${STATUS_LABELS[ailment]}`);
      }
    } else if (isStatusMove) {
      notes.push(`${ailment.replace(/-/g, ' ')} não entra na conta`);
    }
  }

  // Campo.
  if (WEATHER_MOVES[move.slug]) {
    battle.field = { ...battle.field, weather: WEATHER_MOVES[move.slug] };
    notes.push(`o clima vira ${WEATHER_LABELS[WEATHER_MOVES[move.slug]]}`);
  } else if (TERRAIN_MOVES[move.slug]) {
    battle.field = { ...battle.field, terrain: TERRAIN_MOVES[move.slug] };
    notes.push(`${TERRAIN_LABELS[TERRAIN_MOVES[move.slug]]} em campo`);
  } else if (USER_SIDE_MOVES[move.slug]) {
    const key = USER_SIDE_MOVES[move.slug];
    if (key === 'auroraVeil' && battle.field.weather !== 'snow') notes.push('falhou: Aurora Veil precisa de neve');
    else {
      battle.conditions[from] = { ...battle.conditions[from], [key]: true };
      notes.push(`${move.slug.replace(/-/g, ' ')} no seu lado`);
    }
  } else if (ROOM_MOVES[move.slug]) {
    const key = ROOM_MOVES[move.slug];
    battle.field = { ...battle.field, [key]: !battle.field[key] };
    notes.push(`${ROOM_LABELS[key]} ${battle.field[key] ? 'ativado' : 'desfeito'}`);
  } else if (move.slug === 'stealth-rock') {
    battle.conditions[to] = { ...battle.conditions[to], stealthRock: true };
    notes.push(`Stealth Rock no lado de ${names[to]}`);
  } else if (move.slug === 'spikes') {
    const spikes = Math.min(3, (battle.conditions[to].spikes ?? 0) + 1);
    battle.conditions[to] = { ...battle.conditions[to], spikes };
    notes.push(`${spikes}× Spikes no lado de ${names[to]}`);
  }

  if (isStatusMove && notes.length === 0) notes.push('sem efeito na conta');
  return notes;
}
