import { PRIMAL_WEATHERS, TERRAIN_ABILITIES, WEATHER_ABILITIES } from '../data/battleModifiers';

/*
  Prazo de clima, terreno, salas, telas e Tailwind, em turnos que faltam contando o atual. O campo e cada lado guardam
  `timers`: { [chave]: { of, turns } }, em que `of` é o valor a que o prazo pertence (um prazo de sol não serve para a
  chuva) e `turns` 0 é sem prazo. O que está em campo sem prazo anotado ganha o padrão (withTimers).
*/

export const FOREVER = 0;
export const MAX_DURATION = 8;

export const FIELD_TIMED = ['weather', 'terrain', 'trickRoom', 'magicRoom', 'wonderRoom', 'gravity'];
export const SIDE_TIMED = ['reflect', 'lightScreen', 'auroraVeil', 'tailwind'];

const WEATHER_ROCKS = { sun: 'heat-rock', rain: 'damp-rock', sand: 'smooth-rock', snow: 'icy-rock' };
const SCREENS = new Set(['reflect', 'lightScreen', 'auroraVeil']);
const SETTERS = { weather: WEATHER_ABILITIES, terrain: TERRAIN_ABILITIES };

/** Quantos turnos dura o efeito criado por quem segura `item` (o item em efeito). */
export function durationOf(key, value, item = '') {
  if (key === 'tailwind') return 4;
  if (key === 'weather') {
    if (PRIMAL_WEATHERS.has(value)) return FOREVER;
    return item && WEATHER_ROCKS[value] === item ? 8 : 5;
  }
  if (key === 'terrain') return item === 'terrain-extender' ? 8 : 5;
  if (SCREENS.has(key)) return item === 'light-clay' ? 8 : 5;
  return 5;
}

/** Turnos que faltam para o efeito que está em campo; null se ele não está ou não tem prazo anotado. */
export function turnsLeft(holder, key) {
  const value = holder[key];
  const timer = holder.timers?.[key];
  return value && timer?.of === value ? timer.turns : null;
}

/** O campo ou o lado com o prazo de `key` anotado. */
export const withTimer = (holder, key, turns, value = holder[key]) => (
  { ...holder, timers: { ...holder.timers, [key]: { of: value, turns } } }
);

/** Os prazos sem o de `key`, para quando o efeito é mudado à mão. */
export function withoutTimer(timers, key) {
  const rest = { ...timers };
  delete rest[key];
  return rest;
}

function fillTimers(holder, keys, itemFor) {
  const timers = {};
  for (const key of keys) {
    const value = holder[key];
    if (!value || value === 'none') continue;
    timers[key] = { of: value, turns: turnsLeft(holder, key) ?? durationOf(key, value, itemFor(key, value)) };
  }
  return { ...holder, timers };
}

/**
 * O campo com prazo em tudo que está ativo, e só nisso. `sources` é quem está em campo ({ ability, item em efeito }):
 * clima e terreno sem prazo são de quem tem a habilidade que os traz, e as telas, do próprio lado.
 */
export function withTimers(field, sources) {
  const filled = fillTimers(field, FIELD_TIMED, (key, value) => (
    sources.find((source) => SETTERS[key]?.[source.ability] === value)?.item
  ));
  return { ...filled, sides: field.sides.map((side, index) => fillTimers(side, SIDE_TIMED, () => sources[index]?.item)) };
}

/** Passa um turno dos prazos de `keys`; devolve o campo ou lado novo e o que acabou, como [chave, valor]. */
export function countDown(holder, keys) {
  const next = { ...holder, timers: { ...holder.timers } };
  const ended = [];
  for (const key of keys) {
    const left = turnsLeft(holder, key);
    if (!left) continue;
    if (left > 1) {
      next.timers[key] = { of: holder[key], turns: left - 1 };
      continue;
    }
    ended.push([key, holder[key]]);
    delete next.timers[key];
    next[key] = key === 'weather' || key === 'terrain' ? '' : false;
  }
  return { next, ended };
}

/** Como o campo estará no turno `turn` contado de agora (1 = este), se nada novo acontecer; null se não muda. */
export function fieldAtTurn(field, turn) {
  let changed = false;
  const expire = (holder, keys) => {
    const next = { ...holder };
    for (const key of keys) {
      const left = turnsLeft(holder, key);
      if (!left || left >= turn) continue;
      next[key] = key === 'weather' || key === 'terrain' ? '' : false;
      changed = true;
    }
    return next;
  };
  const next = { ...expire(field, FIELD_TIMED), sides: field.sides.map((side) => expire(side, SIDE_TIMED)) };
  return changed ? next : null;
}
