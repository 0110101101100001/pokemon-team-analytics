import { GMAX_OUTCOMES } from '../data/gmaxMoves';
import { isGrounded } from './damage';
import { baseMaxHp } from './dynamax';
import { effectiveness } from './typeChart';
import {
  MOLD_BREAKERS, PRIMAL_WEATHERS, WEATHER_ABILITIES, WEATHER_SUPPRESSORS, hasSecondaryEffect,
} from '../data/battleModifiers';

/*
  Efeitos de um golpe no turno simulado, a partir do que a PokéAPI publica (services/api.js → moveEffectsOf):
  estágios, status, cura, dreno e recuo, Leech Seed, e os golpes que mudam o campo (clima, terreno, telas, salas,
  hazards). Só entram os efeitos certos (chance 0 ou 100): a simulação usa o resultado médio, não sorteia.
  Golpes Z não têm efeito; os Max e G-Max têm os próprios (MAX_EFFECTS).
  `battle` é o estado mutável do turno: { combatants, hp, boosts, status, toxicTurns, sleepTurns, volatiles, conditions, field }.
  `volatiles` é o que os G-Max deixam no Pokémon: { trap: { slug, turns }, confusion (ações), infatuated,
  yawn (turnos), torment (turnos), critStage, lastMove }. O dano por turno deles fica no lado (gmaxDamage).
  O que o jogo sorteia é escolhido no golpe (GMAX_OUTCOMES); confusão e paixão entram pela média.
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
// user e foe: estágios; condition entra no lado de quem usa, hazard no do alvo.
// `sorted`: o que sai do sorteio escolhido; `unmodeled`: o que a calculadora não tem como contar.
const MAX_EFFECTS = {
  'max-strike': { foe: { spe: -1 } },
  'max-knuckle': { user: { atk: 1 } },
  'max-airstream': { user: { spe: 1 } },
  'max-ooze': { user: { spa: 1 } },
  'max-quake': { user: { spd: 1 } },
  'max-steelspike': { user: { def: 1 } },
  'max-flutterby': { foe: { spa: -1 } },
  'max-phantasm': { foe: { def: -1 } },
  'max-wyrmwind': { foe: { atk: -1 } },
  'max-darkness': { foe: { spd: -1 } },
  'max-flare': { weather: 'sun' },
  'max-geyser': { weather: 'rain' },
  'max-rockfall': { weather: 'sand' },
  'max-hailstorm': { weather: 'snow' },
  'max-overgrowth': { terrain: 'grassy' },
  'max-lightning': { terrain: 'electric' },
  'max-mindstorm': { terrain: 'psychic' },
  'max-starfall': { terrain: 'misty' },
  'g-max-foam-burst': { foe: { spe: -2 } },
  'g-max-volt-crash': { status: 'paralysis' },
  'g-max-malodor': { status: 'poison' },
  'g-max-resonance': { condition: 'auroraVeil' },
  'g-max-stonesurge': { hazard: 'stealthRock' },
  'g-max-gravitas': { gravity: true },
  'g-max-finale': { heal: 1 / 6 },
  'g-max-sweetness': { cure: true },
  'g-max-wind-rage': { clear: true },
  'g-max-wildfire': { lasting: true },
  'g-max-vine-lash': { lasting: true },
  'g-max-cannonade': { lasting: true },
  'g-max-volcalith': { lasting: true },
  'g-max-centiferno': { trap: true },
  'g-max-sandblast': { trap: true },
  'g-max-befuddle': { sorted: true },
  'g-max-stun-shock': { sorted: true },
  'g-max-snooze': { sorted: true },
  'g-max-cuddle': { sorted: true },
  'g-max-gold-rush': { confusion: true },
  'g-max-smite': { confusion: true },
  'g-max-meltdown': { torment: true },
  'g-max-chi-strike': { critStage: true },
  'g-max-steelsurge': { hazard: 'steelsurge' },
  'g-max-terror': { unmodeled: 'a troca bloqueada não entra na conta (não há trocas)' },
  'g-max-tartness': { unmodeled: 'a Evasão não entra na conta (todo golpe acerta)' },
  'g-max-depletion': { unmodeled: 'o PP não entra na conta' },
  'g-max-replenish': { unmodeled: 'a Berry não volta: a conta não consome Berries' },
};
const GMAX_DURATION = 4;
const TORMENT_TURNS = 3;
// A confusão atrapalha de 1 a 4 ações; a simulação usa 2, como no sono.
const CONFUSED_ACTIONS = 2;
// Sonolência: adormece no fim do turno seguinte.
const YAWN_TURNS = 2;
const IMMUNE_STATUSES = {
  insomnia: ['sleep'], 'vital-spirit': ['sleep'], 'sweet-veil': ['sleep'],
  immunity: ['poison', 'toxic'], 'pastel-veil': ['poison', 'toxic'],
  limber: ['paralysis'],
  'water-veil': ['burn'], 'water-bubble': ['burn'], 'thermal-exchange': ['burn'],
  'magma-armor': ['freeze'],
  'purifying-salt': [...MAIN_STATUSES, 'toxic'], comatose: [...MAIN_STATUSES, 'toxic'],
};
const CONDITION_LABELS = { steelsurge: 'Steelsurge', auroraVeil: 'Aurora Veil', stealthRock: 'Stealth Rock' };
const WEATHER_HEAL = new Set(['moonlight', 'synthesis', 'morning-sun']);
// Curam o alvo, não o usuário.
const HEALS_TARGET = new Set(['heal-pulse', 'floral-healing']);

/*
  Correções dos dados da PokéAPI. Os golpes da Geração 9 vêm sem `meta` (categoria nula): sem ela não dá para saber
  se os estágios de um golpe de dano vão para o usuário ou para o alvo, e alguns nem trazem os estágios.
*/
const SELF_STAT_MOVES = new Set(['make-it-rain', 'spin-out', 'armor-cannon', 'headlong-rush', 'aqua-step', 'electro-shot', 'torch-song', 'trailblaze', 'tera-blast']);
const MISSING_STAT_CHANGES = {
  'headlong-rush': [{ stat: 'def', change: -1 }, { stat: 'spd', change: -1 }],
  'victory-dance': [{ stat: 'atk', change: 1 }, { stat: 'def', change: 1 }, { stat: 'spe', change: 1 }],
  shelter: [{ stat: 'def', change: 2 }],
  'take-heart': [{ stat: 'spa', change: 1 }, { stat: 'spd', change: 1 }],
  // Belly Drum leva o Atk ao máximo: +12 garante o +6 de qualquer estágio de partida.
  'belly-drum': [{ stat: 'atk', change: 12 }],
};
// Efeitos que dependem do que a simulação não acompanha (Burning Jealousy só queima quem subiu estágios no turno).
const CONDITIONAL_AILMENTS = new Set(['burning-jealousy']);
// Custo em PS do usuário, em fração dos PS máximos. Os de status falham sem PS para pagar; os de dano cobram sempre.
const HP_COST = { 'belly-drum': 1 / 2, 'fillet-away': 1 / 2, 'clangorous-soul': 1 / 3, 'mind-blown': 1 / 2, 'steel-beam': 1 / 2, chloroblast: 1 / 2 };

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
function statusBlocked(battle, index, status, move, from = null) {
  const target = battle.combatants[index];
  const { types } = target;
  const ignored = from != null && from !== index && MOLD_BREAKERS.has(battle.combatants[from].ability);
  if (!ignored) {
    if (IMMUNE_STATUSES[target.ability]?.includes(status)) return 'é imune pela habilidade';
    if (target.ability === 'leaf-guard' && ['sun', 'harsh-sun'].includes(activeField(battle).weather)) return 'é protegido pela Leaf Guard';
  }
  if (battle.status[index]) return `${STATUS_LABELS[battle.status[index]] ?? 'com status'}, não recebe outro`;
  if (battle.field.terrain === 'misty' && isGrounded(target, battle.field)) return 'Misty Terrain protege de status';
  if (POWDER_MOVES.has(move.slug) && types.includes('grass')) return 'o tipo Grass é imune a pós';
  if (move.slug === 'thunder-wave' && effectiveness('electric', types) === 0) return 'imune a Thunder Wave';
  if (status === 'burn' && types.includes('fire')) return 'o tipo Fire não se queima';
  if ((status === 'poison' || status === 'toxic') && (types.includes('poison') || types.includes('steel'))) return 'imune a veneno';
  if (status === 'paralysis' && types.includes('electric')) return 'o tipo Electric não fica paralisado';
  if (status === 'freeze' && types.includes('ice')) return 'o tipo Ice não congela';
  if (status === 'sleep' && battle.field.terrain === 'electric' && isGrounded(target, battle.field)) return 'Electric Terrain impede o sono';
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

/** O campo como vale agora: com Cloud Nine ou Air Lock em campo, sem clima. */
export function activeField(battle) {
  const suppressed = battle.combatants.some(({ ability }, index) => battle.hp[index] > 0 && WEATHER_SUPPRESSORS.has(ability));
  return suppressed ? { ...battle.field, weather: '' } : battle.field;
}

/** Troca o clima e devolve a frase do registro; climas primais não cedem. */
function setWeather(battle, weather) {
  const primal = PRIMAL_WEATHERS.has(battle.field.weather)
    || battle.combatants.some(({ ability }, index) => battle.hp[index] > 0 && PRIMAL_WEATHERS.has(WEATHER_ABILITIES[ability]));
  if (primal) return 'o clima primal não muda';
  battle.field = { ...battle.field, weather };
  return `o clima vira ${WEATHER_LABELS[weather]}`;
}

/** Se o Sheer Force do usuário tira o efeito secundário do golpe (e, com ele, o custo da Life Orb). */
export const removesSecondary = (move, user) => user.ability === 'sheer-force' && hasSecondaryEffect(move);

/** Se o efeito secundário não chega ao alvo: Shield Dust ou Covert Cloak. */
function shielded(battle, { from, to, move }) {
  if (!hasSecondaryEffect(move)) return false;
  const target = battle.combatants[to];
  if (target.ability === 'shield-dust' && !MOLD_BREAKERS.has(battle.combatants[from].ability)) return true;
  return target.item === 'covert-cloak' && !battle.field.magicRoom && target.ability !== 'klutz';
}

/** Põe no alvo um status de G-Max e devolve a frase do registro. */
function inflict(battle, { from, to, move, names }, status) {
  const blocked = statusBlocked(battle, to, status, move, from);
  if (blocked) return `falhou: ${names[to]} ${blocked}`;
  battle.status[to] = status;
  battle.toxicTurns[to] = 0;
  if (status === 'sleep') battle.sleepTurns[to] = SLEEP_TURNS;
  return `${names[to]} ficou ${STATUS_LABELS[status]}`;
}

/** O que um G-Max deixa no alvo além de estágios e status; devolve as frases do registro. */
function applyLingering(battle, context, effect, outcome) {
  const { from, to, move, names } = context;
  const target = battle.combatants[to];
  const ability = MOLD_BREAKERS.has(battle.combatants[from].ability) ? '' : target.ability;
  const current = battle.volatiles[to];
  const set = (changes) => { battle.volatiles[to] = { ...current, ...changes }; };

  if (effect.trap && !current.trap) {
    set({ trap: { slug: move.slug, turns: Number(outcome) } });
    return [`${names[to]} fica preso por ${outcome} turnos`];
  }
  if (effect.confusion && !current.confusion) {
    if (ability === 'own-tempo') return [`${names[to]} não se confunde (Own Tempo)`];
    if (battle.field.terrain === 'misty' && isGrounded(target, battle.field)) return [`${names[to]} não se confunde (Misty Terrain)`];
    set({ confusion: CONFUSED_ACTIONS });
    return [`${names[to]} ficou confuso`];
  }
  if (effect.torment && !current.torment && !target.dynamax) {
    if (ability === 'aroma-veil') return [`${names[to]} ignora o Torment (Aroma Veil)`];
    set({ torment: TORMENT_TURNS });
    return [`${names[to]} não pode repetir golpe`];
  }
  if (!effect.sorted || outcome === 'none') return [];
  if (outcome === 'infatuated') {
    if (current.infatuated) return [];
    if (ability === 'oblivious' || ability === 'aroma-veil') return [`${names[to]} não se apaixona (habilidade)`];
    set({ infatuated: true });
    return [`${names[to]} se apaixonou`];
  }
  if (outcome === 'yawn') {
    if (current.yawn) return [];
    const blocked = statusBlocked(battle, to, 'sleep', move, from);
    if (blocked) return [`falhou: ${names[to]} ${blocked}`];
    set({ yawn: YAWN_TURNS });
    return [`${names[to]} ficou sonolento`];
  }
  return [inflict(battle, context, outcome)];
}

/** Fim do turno dos efeitos com prazo; devolve as linhas do registro. */
export function passEffects(battle, names) {
  const lines = [];
  [0, 1].forEach((index) => {
    const lasting = battle.conditions[index].gmaxDamage;
    if (lasting) {
      const gmaxDamage = lasting.turns > 1 ? { ...lasting, turns: lasting.turns - 1 } : null;
      battle.conditions[index] = { ...battle.conditions[index], gmaxDamage };
    }
    if (battle.hp[index] <= 0) {
      battle.volatiles[index] = {};
      return;
    }
    const next = { ...battle.volatiles[index] };
    if (next.trap) next.trap = next.trap.turns > 1 ? { ...next.trap, turns: next.trap.turns - 1 } : null;
    if (next.torment) next.torment -= 1;
    if (next.yawn) {
      next.yawn -= 1;
      if (!next.yawn && !statusBlocked(battle, index, 'sleep', { slug: 'yawn' })) {
        battle.status[index] = 'sleep';
        battle.sleepTurns[index] = SLEEP_TURNS;
        lines.push({ side: index, kind: 'status', text: `${names[index]} adormeceu de sonolência.` });
      }
    }
    battle.volatiles[index] = next;
  });
  return lines;
}

/** Efeito de um golpe Max ou G-Max que acertou. */
function applyMaxEffect(battle, { from, to, move, names }) {
  const effect = MAX_EFFECTS[move.slug];
  if (!effect) return [];
  const notes = [];
  const targetUp = battle.hp[to] > 0;
  for (const [key, index] of [['user', from], ['foe', to]]) {
    if (!effect[key] || battle.hp[index] <= 0) continue;
    const changes = Object.entries(effect[key]).map(([stat, change]) => ({ stat, change }));
    const applied = changeStages(battle, index, changes, key === 'foe');
    if (applied.length) notes.push(`${key === 'foe' ? `${names[to]}: ` : ''}${applied.join(', ')}`);
  }
  if (effect.weather) notes.push(setWeather(battle, effect.weather));
  if (effect.terrain) {
    battle.field = { ...battle.field, terrain: effect.terrain };
    notes.push(`${TERRAIN_LABELS[effect.terrain]} em campo`);
  }
  if (effect.gravity && !battle.field.gravity) {
    battle.field = { ...battle.field, gravity: true };
    notes.push('Gravity ativado');
  }
  for (const [condition, index] of [[effect.condition, from], [effect.hazard, to]]) {
    if (!condition) continue;
    battle.conditions[index] = { ...battle.conditions[index], [condition]: true };
    notes.push(`${CONDITION_LABELS[condition]} no lado de ${names[index]}`);
  }
  if (effect.status && targetUp) notes.push(inflict(battle, { from, to, move, names }, effect.status));
  if (targetUp) {
    const options = GMAX_OUTCOMES[move.slug];
    const outcome = options && (options.find(([value]) => value === move.outcome) ?? options[0])[0];
    notes.push(...applyLingering(battle, { from, to, move, names }, effect, outcome));
  }
  if (effect.lasting && !battle.conditions[to].gmaxDamage) {
    battle.conditions[to] = { ...battle.conditions[to], gmaxDamage: { slug: move.slug, turns: GMAX_DURATION } };
    notes.push(`dano por ${GMAX_DURATION} turnos no lado de ${names[to]}`);
  }
  if (effect.critStage && (battle.volatiles[from].critStage ?? 0) < 3) {
    const critStage = (battle.volatiles[from].critStage ?? 0) + 1;
    battle.volatiles[from] = { ...battle.volatiles[from], critStage };
    notes.push(`crítico +${critStage}`);
  }
  if (effect.unmodeled) notes.push(effect.unmodeled);
  if (effect.heal) {
    const healed = heal(battle, from, Math.floor(battle.combatants[from].stats.hp * effect.heal));
    if (healed) notes.push(`recupera ${healed} PS`);
  }
  if (effect.cure && battle.status[from]) {
    battle.status[from] = '';
    battle.toxicTurns[from] = 0;
    notes.push('cura o próprio status');
  }
  if (effect.clear) {
    battle.conditions[from] = { ...battle.conditions[from], stealthRock: false, steelsurge: false, spikes: 0 };
    battle.conditions[to] = { ...battle.conditions[to], stealthRock: false, steelsurge: false, spikes: 0, reflect: false, lightScreen: false, auroraVeil: false };
    battle.field = { ...battle.field, terrain: '' };
    notes.push('limpa telas, hazards e terreno');
  }
  return notes;
}

const isCertain = (chance) => chance === 0 || chance >= 100;

/** Se os estágios do golpe vão para o usuário (Draco Meteor, Close Combat, Swords Dance) ou para o alvo. */
function statsGoToUser(move, effects) {
  if (SELF_STAT_MOVES.has(move.slug) || effects.category === 'damage-raise') return true;
  if (effects.category === 'damage-lower') return false;
  return SELF_TARGETS.has(effects.target);
}

/** Cobra o custo em PS do golpe e devolve a frase do registro. */
function payHpCost(battle, index, slug, isStatusMove) {
  const max = battle.combatants[index].stats.hp;
  const cost = isStatusMove ? Math.floor(max * HP_COST[slug]) : Math.round(max * HP_COST[slug]);
  const paid = Math.min(battle.hp[index], cost);
  battle.hp[index] -= paid;
  return `perde ${paid} PS`;
}

/**
 * Aplica os efeitos do golpe que `from` acabou de usar em `to`. `damage` é o dano causado (0 nos de status).
 * Devolve as frases do registro (sem o nome de quem usou).
 */
export function applyMoveEffects(battle, { from, to, move, damage, names }) {
  if (move.powered) return damage > 0 ? applyMaxEffect(battle, { from, to, move, names }) : [];
  const effects = move.effects;
  const notes = [];
  const user = battle.combatants[from];
  const isStatusMove = move.category === 'status';
  const { weather } = activeField(battle);
  const noSecondary = !isStatusMove && removesSecondary(move, user);
  // Efeitos no alvo de um golpe de dano: nada se ele caiu ou se está protegido do efeito secundário.
  const targetSpared = !isStatusMove && (battle.hp[to] <= 0 || shielded(battle, { from, to, move }));
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
  if (HP_COST[move.slug] && isStatusMove) {
    if (battle.hp[from] <= Math.floor(user.stats.hp * HP_COST[move.slug])) return ['falhou: PS insuficientes para pagar o custo'];
    notes.push(payHpCost(battle, from, move.slug, true));
  }
  if (effects.healing > 0 && isStatusMove) {
    const healedIndex = HEALS_TARGET.has(move.slug) ? to : from;
    let fraction = effects.healing / 100;
    if (WEATHER_HEAL.has(move.slug) && weather) fraction = ['sun', 'harsh-sun'].includes(weather) ? 2 / 3 : 1 / 4;
    if (move.slug === 'shore-up' && weather === 'sand') fraction = 2 / 3;
    if (move.slug === 'floral-healing' && battle.field.terrain === 'grassy') fraction = 2 / 3;
    const healed = heal(battle, healedIndex, Math.floor(baseMaxHp(battle.combatants[healedIndex]) * fraction));
    const who = healedIndex === to ? `${names[to]}: ` : '';
    notes.push(healed ? `${who}+${healed} PS` : `${who}os PS já estão cheios`);
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

  // Custo em PS dos golpes de dano (Mind Blown, Steel Beam, Chloroblast): cobrado mesmo que o alvo caia.
  if (HP_COST[move.slug] && !isStatusMove && damage > 0 && user.ability !== 'magic-guard') {
    notes.push(payHpCost(battle, from, move.slug, false));
  }

  // Estágios: golpes de dano que sobem os do usuário (ou baixam, como Close Combat) e os que baixam os do alvo.
  // Tera Blast só baixa Atk e SpA do usuário com Tera Stellar.
  const statChanges = MISSING_STAT_CHANGES[move.slug] ?? effects.statChanges;
  const statsApply = move.slug !== 'tera-blast' || user.tera === 'stellar';
  const toUser = statsGoToUser(move, effects);
  if (statChanges.length && statsApply && !noSecondary && (toUser || !targetSpared)
    && (isStatusMove || damage > 0) && isCertain(effects.statChance)) {
    const index = toUser ? from : to;
    const applied = changeStages(battle, index, statChanges, !toUser);
    if (applied.length) notes.push(`${toUser ? '' : `${names[to]}: `}${applied.join(', ')}`);
    else if (isStatusMove) notes.push('os estágios já estão no limite');
  }

  // Status e Leech Seed.
  if (effects.ailment && !noSecondary && !targetSpared && !CONDITIONAL_AILMENTS.has(move.slug) && (isStatusMove || damage > 0) && isCertain(effects.ailmentChance)) {
    const ailment = move.slug === 'toxic' ? 'toxic' : effects.ailment;
    if (ailment === 'leech-seed') {
      if (battle.combatants[to].types.includes('grass')) notes.push('falhou: o tipo Grass é imune a Leech Seed');
      else {
        battle.conditions[to] = { ...battle.conditions[to], leechSeed: true };
        notes.push(`${names[to]} foi semeado`);
      }
    } else if (MAIN_STATUSES.has(ailment) || ailment === 'toxic') {
      const blocked = statusBlocked(battle, to, ailment, move, from);
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
    notes.push(setWeather(battle, WEATHER_MOVES[move.slug]));
  } else if (TERRAIN_MOVES[move.slug]) {
    battle.field = { ...battle.field, terrain: TERRAIN_MOVES[move.slug] };
    notes.push(`${TERRAIN_LABELS[TERRAIN_MOVES[move.slug]]} em campo`);
  } else if (USER_SIDE_MOVES[move.slug]) {
    const key = USER_SIDE_MOVES[move.slug];
    if (key === 'auroraVeil' && weather !== 'snow') notes.push('falhou: Aurora Veil precisa de neve');
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
