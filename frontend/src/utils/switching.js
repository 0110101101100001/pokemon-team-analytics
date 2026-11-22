import {
  MOLD_BREAKERS, PRIMAL_WEATHERS, TERRAIN_ABILITIES, WEATHER_ABILITIES,
} from '../data/battleModifiers';
import { activeItem, applyBoost, isGrounded } from './damage';
import { baseMaxHp, withoutDynamax } from './dynamax';
import { formatSlug } from './filters';
import { changeStages, setWeather, statusBlocked } from './moveEffects';
import { effectiveness } from './typeChart';

/*
  Trocas no turno simulado: quem pode sair, o que se perde ao sair e o que acontece ao entrar (hazards e habilidades
  de entrada). `battle` é o estado mutável do turno (utils/turn), com mais dois campos: `bench`, as reservas de cada
  lado como combatentes (`uid`, `name`, `rawAbility`), e `benched`, o estado final de quem saiu, por uid.
*/

export const PIVOT_MOVES = new Set(['u-turn', 'volt-switch', 'flip-turn', 'parting-shot', 'baton-pass', 'teleport', 'chilly-reception']);
export const PHAZE_MOVES = new Set(['roar', 'whirlwind', 'dragon-tail', 'circle-throw']);

const NO_BOOSTS = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const SPIKES_FRACTION = [0, 1 / 8, 1 / 6, 1 / 4];
const INTIMIDATE_IMMUNE = new Set(['inner-focus', 'own-tempo', 'oblivious', 'scrappy']);
const STAYS_IN = new Set(['suction-cups', 'guard-dog']);
// Só valem na primeira entrada da batalha.
const ONCE_BOOSTS = { 'intrepid-sword': 'atk', 'dauntless-shield': 'def' };
// Presos por estes continuam presos mesmo que quem prendeu saia.
const LASTING_TRAPS = new Set(['g-max-centiferno', 'g-max-sandblast']);

/** Motivo de o Pokémon não poder ser trocado, ou null. Golpes como U-turn ignoram isto. */
export function trapReason(own, foe, field) {
  if (own.types.includes('ghost') || activeItem(own, field) === 'shed-shell') return null;
  const { trap, trapped } = own.volatiles ?? {};
  if (trap || trapped) return `preso por ${formatSlug(trap?.slug ?? trapped).replace('G Max', 'G-Max')}`;
  if (!foe || foe.currentHp === 0) return null;
  if (foe.ability === 'shadow-tag' && own.ability !== 'shadow-tag') return 'preso por Shadow Tag';
  if (foe.ability === 'arena-trap' && isGrounded(own, field)) return 'preso por Arena Trap';
  if (foe.ability === 'magnet-pull' && own.types.includes('steel')) return 'preso por Magnet Pull';
  return null;
}

/** Se um golpe como Roar consegue arrastar o alvo para fora. */
export function canDrag(user, target) {
  if (target.dynamax) return false;
  if (MOLD_BREAKERS.has(user.ability)) return true;
  return !STAYS_IN.has(target.ability);
}

/** Quem entra: o escolhido, se puder, ou a primeira reserva de pé; null sem reservas. */
export function incomingOf(bench, preferred) {
  const standing = bench.filter((member) => member.currentHp !== 0);
  return standing.find((member) => member.uid === preferred) ?? standing[0] ?? null;
}

/** O que prendia ou encantava o oponente acaba quando `index` sai ou desmaia. */
export function releaseOpponent(battle, index) {
  const other = 1 - index;
  const next = { ...battle.volatiles[other], trapped: null, infatuated: false };
  if (next.trap && !LASTING_TRAPS.has(next.trap.slug)) next.trap = null;
  battle.volatiles[other] = next;
}

/** Um clima primal acaba quando ninguém em campo o sustenta. */
export function settlePrimal(battle) {
  const { weather } = battle.field;
  if (!PRIMAL_WEATHERS.has(weather)) return false;
  const held = battle.combatants.some(({ ability }, index) => battle.hp[index] > 0 && WEATHER_ABILITIES[ability] === weather);
  if (held) return false;
  battle.field = { ...battle.field, weather: '' };
  return true;
}

/** Neutralizing Gas desliga a habilidade do oponente, conforme quem está em campo. */
function refreshAbilities(battle) {
  const raw = battle.combatants.map((side) => side.rawAbility ?? side.ability);
  battle.combatants.forEach((side, index) => {
    const off = raw[index] !== 'neutralizing-gas' && battle.hp[1 - index] > 0 && raw[1 - index] === 'neutralizing-gas';
    battle.combatants[index] = { ...side, rawAbility: raw[index], ability: off ? '' : raw[index] };
  });
}

/**
 * Tira `index` de campo e põe `incoming` no lugar, sem os efeitos de entrada (arrive). Com `pass` (Baton Pass),
 * estágios, confusão, prisão de dano e Leech Seed ficam para quem entra. Devolve as linhas do registro.
 */
export function replaceActive(battle, index, incoming, { pass = false, names }) {
  const lines = [];
  const say = (text, kind = 'info') => lines.push({ side: index, text, kind });
  const leaving = battle.combatants[index];
  const alive = battle.hp[index] > 0;
  const max = baseMaxHp(leaving);
  let hp = battle.hp[index];
  let status = battle.status[index];
  if (alive && leaving.dynamax) hp = withoutDynamax(hp, leaving.species);
  if (alive && leaving.ability === 'regenerator' && hp < max) {
    const healed = Math.min(max - hp, Math.floor(max / 3));
    hp += healed;
    say(`${names[index]}: +${healed} PS do Regenerator.`, 'heal');
  }
  if (alive && leaving.ability === 'natural-cure' && status) {
    status = '';
    say(`${names[index]} cura o status (Natural Cure).`, 'heal');
  }

  const dynamaxSpent = Boolean(leaving.dynamax || leaving.dynamaxSpent);
  const left = {
    currentHp: hp >= max ? null : hp,
    status,
    sleepTurns: status === 'sleep' ? battle.sleepTurns[index] : null,
    toxicTurns: 0,
    boosts: { ...NO_BOOSTS },
    volatiles: {},
    bide: null,
    lastHit: null,
    turnsOut: 0,
    entered: false,
    dynamax: 0,
    dynamaxSpent,
    boostUsed: Boolean(battle.boostUsed[index]),
    ...(alive && leaving.ability === 'zero-to-hero' && leaving.species?.startsWith('palafin') && { form: 'palafin-hero' }),
  };
  battle.benched.set(leaving.uid, left);
  const benchedSide = {
    ...leaving,
    ...left,
    name: names[index],
    ability: leaving.rawAbility ?? leaving.ability,
    stats: { ...leaving.stats, hp: max },
  };
  battle.bench[index] = battle.bench[index].map((member) => (member.uid === incoming.uid ? benchedSide : member));
  battle.benched.delete(incoming.uid);

  const boosts = pass ? battle.boosts[index] : NO_BOOSTS;
  const { confusion, trap } = battle.volatiles[index];
  releaseOpponent(battle, index);
  if (!pass && battle.conditions[index].leechSeed) battle.conditions[index] = { ...battle.conditions[index], leechSeed: false };

  const gasLeft = alive && leaving.ability === 'neutralizing-gas';
  say(alive ? `${names[index]} sai; entra ${incoming.name}.` : `Entra ${incoming.name}.`);
  battle.combatants[index] = { ...incoming, dynamax: 0, dynamaxSpent };
  names[index] = incoming.name;
  battle.hp[index] = Math.min(incoming.stats.hp, incoming.currentHp ?? incoming.stats.hp);
  battle.boosts[index] = { ...boosts };
  battle.status[index] = incoming.status ?? '';
  battle.sleepTurns[index] = incoming.sleepTurns ?? null;
  battle.toxicTurns[index] = 0;
  battle.bide[index] = null;
  battle.lastHit[index] = null;
  battle.turnsOut[index] = 0;
  battle.boostUsed[index] = Boolean(incoming.boostUsed);
  battle.volatiles[index] = pass ? { confusion, trap } : {};
  refreshAbilities(battle);
  if (settlePrimal(battle)) say('o clima primal acaba.', 'field');
  // Sem o gás, a habilidade do oponente volta e age de novo.
  if (gasLeft && battle.hp[1 - index] > 0) lines.push(...enterAbility(battle, 1 - index, names));
  return lines;
}

function hazards(battle, index, names) {
  const lines = [];
  const say = (text, kind) => lines.push({ side: index, text, kind });
  const side = battle.combatants[index];
  const conditions = battle.conditions[index];
  const grounded = isGrounded(side, battle.field);
  const boots = activeItem(side, battle.field) === 'heavy-duty-boots';
  const max = side.stats.hp;

  if (!boots && side.ability !== 'magic-guard') {
    const hurts = [
      conditions.stealthRock && ['Stealth Rock', effectiveness('rock', side.types) / 8],
      conditions.steelsurge && ['Steelsurge', effectiveness('steel', side.types) / 8],
      grounded && conditions.spikes > 0 && ['Spikes', SPIKES_FRACTION[conditions.spikes]],
    ].filter(Boolean);
    for (const [name, fraction] of hurts) {
      if (!fraction || battle.hp[index] <= 0) continue;
      const damage = Math.min(battle.hp[index], Math.max(1, Math.floor(max * fraction)));
      battle.hp[index] -= damage;
      say(`${names[index]}: −${damage} PS ao entrar (${name}).`, 'damage');
    }
  }
  if (battle.hp[index] <= 0) {
    say(`${names[index]} desmaiou.`, 'faint');
    return lines;
  }
  if (!grounded) return lines;

  if (conditions.toxicSpikes > 0) {
    if (side.types.includes('poison')) {
      battle.conditions[index] = { ...conditions, toxicSpikes: 0 };
      say(`${names[index]} absorve as Toxic Spikes.`, 'field');
    } else if (!boots) {
      const status = conditions.toxicSpikes >= 2 ? 'toxic' : 'poison';
      if (!statusBlocked(battle, index, status, { slug: 'toxic-spikes' })) {
        battle.status[index] = status;
        battle.toxicTurns[index] = 0;
        say(`${names[index]} ficou ${status === 'toxic' ? 'muito envenenado' : 'envenenado'} (Toxic Spikes).`, 'status');
      }
    }
  }
  if (conditions.stickyWeb && !boots) {
    const applied = changeStages(battle, index, [{ stat: 'spe', change: -1 }], true);
    if (applied.length) say(`${names[index]}: ${applied.join(', ')} (Sticky Web).`, 'status');
  }
  return lines;
}

function enterAbility(battle, index, names) {
  const lines = [];
  const say = (text, kind = 'status') => lines.push({ side: index, text, kind });
  const other = 1 - index;
  const side = battle.combatants[index];
  const foe = battle.combatants[other];
  const { ability } = side;
  const label = formatSlug(ability);

  const weather = WEATHER_ABILITIES[ability];
  if (weather && battle.field.weather !== weather) {
    let note;
    if (PRIMAL_WEATHERS.has(weather)) {
      battle.field = { ...battle.field, weather };
      note = 'clima primal em campo';
    } else {
      note = setWeather(battle, weather);
    }
    say(`${names[index]}: ${note} (${label}).`, 'field');
  }
  const terrain = TERRAIN_ABILITIES[ability];
  if (terrain && battle.field.terrain !== terrain) {
    battle.field = { ...battle.field, terrain };
    say(`${names[index]} traz ${formatSlug(`${terrain}-terrain`)}.`, 'field');
  }
  if (ability === 'screen-cleaner') {
    battle.conditions.forEach((conditions, at) => {
      battle.conditions[at] = { ...conditions, reflect: false, lightScreen: false, auroraVeil: false };
    });
    say(`${names[index]} derruba as telas (Screen Cleaner).`, 'field');
  }

  const own = [];
  if (ONCE_BOOSTS[ability] && !battle.boostUsed[index]) {
    battle.boostUsed[index] = true;
    own.push({ stat: ONCE_BOOSTS[ability], change: 1 });
  }
  if (ability === 'download' && battle.hp[other] > 0) {
    const def = applyBoost(foe.stats.def, battle.boosts[other].def);
    const spd = applyBoost(foe.stats.spd, battle.boosts[other].spd);
    own.push({ stat: def >= spd ? 'spa' : 'atk', change: 1 });
  }
  if (own.length) {
    const applied = changeStages(battle, index, own, false);
    if (applied.length) say(`${names[index]}: ${applied.join(', ')} (${label}).`);
  }

  if (ability === 'intimidate' && battle.hp[other] > 0) {
    const raises = foe.ability === 'guard-dog';
    const immune = INTIMIDATE_IMMUNE.has(foe.ability) || foe.ability === 'hyper-cutter';
    const applied = immune ? [] : changeStages(battle, other, [{ stat: 'atk', change: raises ? 1 : -1 }], !raises);
    say(applied.length
      ? `${names[other]}: ${applied.join(', ')} (Intimidate de ${names[index]}).`
      : `${names[other]} não cede ao Intimidate.`);
  }
  return lines;
}

/** Efeitos de entrada de quem acabou de chegar: hazards e, se ficou de pé, a habilidade. */
export function arrive(battle, index, names) {
  const lines = hazards(battle, index, names);
  if (battle.hp[index] > 0) lines.push(...enterAbility(battle, index, names));
  else {
    releaseOpponent(battle, index);
    if (settlePrimal(battle)) lines.push({ side: index, text: 'o clima primal acaba.', kind: 'field' });
  }
  return lines;
}
