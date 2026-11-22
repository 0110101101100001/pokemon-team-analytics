import { describe, expect, it } from 'vitest';
import { createField, createMoveSlot, resolveSlot } from '../components/calc/calcState';
import battleData from '../data/battle-data.json';
import { moveSummaryOf } from './battleData';
import { calculateDamage, describeKnockout, residualEffects } from './damage';
import { durationOf, fieldAtTurn, turnsLeft, withTimer, withTimers } from './durations';
import { simulateTurn } from './turn';

const NO_EFFECT = {
  target: 'selected-pokemon', category: null, statChanges: [], statChance: 0,
  ailment: null, ailmentChance: 0, healing: 0, drain: 0, flinchChance: 0,
};
const combatant = (extra = {}) => ({
  level: 100, types: ['normal'], tera: '', item: '', ability: '', status: '',
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  stats: { hp: 400, atk: 200, def: 200, spa: 200, spd: 200, spe: 200 },
  ...extra,
});
const used = (slug, effects = {}) =>
  resolveSlot(createMoveSlot({ ...moveSummaryOf(battleData, slug), effects: { ...NO_EFFECT, ...effects } }));
const selfMove = (slug) => used(slug, { target: 'user' });

/** Um turno a partir do campo dado; devolve o campo e os PS para o turno seguinte. */
function play(field, moves = [null, null], combatants = [combatant(), combatant()], options = {}) {
  const turn = simulateTurn({ combatants, moves, sideConditions: field.sides, field, names: ['A', 'B'], ...options });
  return { ...turn, next: { ...turn.field, sides: turn.conditions }, text: turn.log.map((line) => line.text).join(' | ') };
}
/** Turnos sem ninguém agir, levando o campo e os PS de um para o outro. */
function wait(field, count, combatants = [combatant(), combatant()]) {
  const history = [];
  let current = field;
  let fighters = combatants;
  for (let index = 0; index < count; index += 1) {
    const turn = play(current, [null, null], fighters);
    history.push(turn);
    current = turn.next;
    fighters = fighters.map((fighter, side) => ({ ...fighter, ...turn.sides[side] }));
  }
  return history;
}
const withSide = (field, changes) => ({ ...field, sides: [{ ...field.sides[0], ...changes }, field.sides[1]] });

describe('quanto dura', () => {
  it.each([
    ['weather', 'sun', '', 5],
    ['weather', 'sun', 'heat-rock', 8],
    ['weather', 'rain', 'damp-rock', 8],
    ['weather', 'sand', 'smooth-rock', 8],
    ['weather', 'snow', 'icy-rock', 8],
    ['weather', 'rain', 'heat-rock', 5],
    ['weather', 'harsh-sun', '', 0],
    ['terrain', 'grassy', 'terrain-extender', 8],
    ['reflect', true, 'light-clay', 8],
    ['auroraVeil', true, '', 5],
    ['tailwind', true, 'light-clay', 4],
    ['trickRoom', true, '', 5],
  ])('%s %s com "%s": %i', (key, value, item, turns) => {
    expect(durationOf(key, value, item)).toBe(turns);
  });
});

describe('clima', () => {
  it('um golpe cria o clima por 5 turnos, contando o atual', () => {
    const first = play(createField(), [selfMove('sunny-day'), null]);
    expect(turnsLeft(first.field, 'weather')).toBe(4);
    const rest = wait(first.next, 4);
    expect(rest[2].field.weather).toBe('sun');
    expect(rest[3].field.weather).toBe('');
  });

  it('a pedra estende para 8, e Klutz a desliga', () => {
    const left = (extra) => {
      const first = play(createField(), [selfMove('sunny-day'), null], [combatant({ item: 'heat-rock', ...extra }), combatant()]);
      return turnsLeft(first.field, 'weather');
    };
    expect(left()).toBe(7);
    expect(left({ ability: 'klutz' })).toBe(4);
  });

  it('repetir não renova', () => {
    const turn = play(withTimer({ ...createField(), weather: 'sun' }, 'weather', 2), [selfMove('sunny-day'), null]);
    expect(turnsLeft(turn.field, 'weather')).toBe(1);
    expect(turn.text).toMatch(/falhou/);
  });

  it('a areia fere 4 vezes em 5 turnos', () => {
    const history = wait({ ...createField(), weather: 'sand' }, 5);
    expect(history[3].sides[0].currentHp).toBe(300);
    expect(history[4].sides[0].currentHp).toBe(300);
    expect(history[4].field.weather).toBe('');
  });

  it('o da habilidade usa o item de quem o traz', () => {
    const field = withTimers({ ...createField(), weather: 'sand' }, [{ ability: 'sand-stream', item: 'smooth-rock' }, {}]);
    expect(turnsLeft(field, 'weather')).toBe(8);
  });

  it('entrar com Drought começa a contagem', () => {
    const entrant = combatant({ uid: 2, name: 'C', ability: 'drought', rawAbility: 'drought', item: 'heat-rock' });
    const turn = play(createField(), [null, null], [combatant({ uid: 1 }), combatant()], { bench: [[entrant], []], switches: [2, null] });
    expect(turnsLeft(turn.field, 'weather')).toBe(7);
  });

  it('o primal não acaba', () => {
    const holder = [combatant({ ability: 'desolate-land' }), combatant()];
    expect(wait({ ...createField(), weather: 'harsh-sun' }, 9, holder)[8].field.weather).toBe('harsh-sun');
  });

  it('um prazo de outro clima não vale', () => {
    const field = { ...withTimer({ ...createField(), weather: 'sun' }, 'weather', 2), weather: 'rain' };
    expect(turnsLeft(withTimers(field, [{}, {}]), 'weather')).toBe(5);
  });

  it('sem prazo, não conta', () => {
    expect(play(withTimer({ ...createField(), weather: 'sun' }, 'weather', 0)).field.weather).toBe('sun');
  });
});

describe('telas e Tailwind', () => {
  it('Reflect dura 5 turnos, e 8 com Light Clay', () => {
    expect(turnsLeft(play(createField(), [selfMove('reflect'), null]).conditions[0], 'reflect')).toBe(4);
    const clay = play(createField(), [selfMove('reflect'), null], [combatant({ item: 'light-clay' }), combatant()]);
    expect(turnsLeft(clay.conditions[0], 'reflect')).toBe(7);
  });

  it('acaba no fim do quinto turno', () => {
    const history = wait(withSide(createField(), { lightScreen: true }), 5);
    expect(history[3].conditions[0].lightScreen).toBe(true);
    expect(history[4].conditions[0].lightScreen).toBe(false);
    expect(history[4].text).toMatch(/Light Screen acabou/);
  });

  it('repetir não renova', () => {
    const field = withSide(createField(), withTimer({ reflect: true }, 'reflect', 3));
    expect(turnsLeft(play(field, [selfMove('reflect'), null]).conditions[0], 'reflect')).toBe(2);
  });

  it('Tailwind dura 4 turnos', () => {
    const history = wait(withSide(createField(), { tailwind: true }), 4);
    expect(history[2].conditions[0].tailwind).toBe(true);
    expect(history[3].conditions[0].tailwind).toBe(false);
  });

  it.each(['brick-break', 'psychic-fangs', 'raging-bull'])('%s quebra a tela antes do dano', (slug) => {
    const field = createField();
    const screened = { ...field, sides: [field.sides[0], { ...field.sides[1], reflect: true }] };
    const turn = play(screened, [used(slug), null]);
    expect(turn.conditions[1].reflect).toBe(false);
    expect(turn.sides[1].currentHp).toBe(play(createField(), [used(slug), null]).sides[1].currentHp);
  });
});

describe('terreno e salas', () => {
  it('o Grassy Terrain cura 5 vezes', () => {
    const hurt = [combatant({ currentHp: 100 }), combatant()];
    const history = wait({ ...createField(), terrain: 'grassy' }, 5, hurt);
    expect(history[4].sides[0].currentHp).toBe(225);
    expect(history[4].field.terrain).toBe('');
  });

  it('Ice Spinner tira o terreno', () => {
    expect(play({ ...createField(), terrain: 'misty' }, [used('ice-spinner'), null]).field.terrain).toBe('');
  });

  it('Trick Room de novo desfaz; Gravity de novo falha', () => {
    expect(play({ ...createField(), trickRoom: true }, [selfMove('trick-room'), null]).field.trickRoom).toBe(false);
    const gravity = play({ ...createField(), gravity: true }, [selfMove('gravity'), null]);
    expect(gravity.field.gravity).toBe(true);
    expect(gravity.text).toMatch(/falhou/);
  });

  it('a substituição não gasta o prazo', () => {
    const entrant = combatant({ uid: 2, name: 'C' });
    const turn = play(
      withTimer({ ...createField(), weather: 'sun' }, 'weather', 3),
      [null, null],
      [combatant({ uid: 1, currentHp: 0 }), combatant()],
      { bench: [[entrant], []], switches: [2, null], replacing: true },
    );
    expect(turnsLeft(turn.field, 'weather')).toBe(3);
  });
});

describe('veredito de nocaute', () => {
  it('conta a areia só pelos turnos que faltam', () => {
    const effects = (turns) => residualEffects(
      combatant(), createField().sides[0], withTimer({ ...createField(), weather: 'sand' }, 'weather', turns),
    );
    expect(effects(3).timed).toEqual([{ amount: 25, turns: 2 }]);
    expect(effects(1).timed).toEqual([]);
  });

  it('a tela que acaba deixa os golpes seguintes mais fortes', () => {
    const [attacker, defender] = [combatant(), combatant()];
    const move = used('return');
    const base = createField();
    const field = { ...base, sides: [base.sides[0], withTimer({ ...base.sides[1], reflect: true }, 'reflect', 1)] };
    const result = calculateDamage({ attacker, defender, move, field, defenderSide: field.sides[1] });
    const later = fieldAtTurn(field, 2);
    const context = { attacker, defender, defenderSide: field.sides[1], field };
    const resultAt = () => calculateDamage({ attacker, defender, move, field: later, defenderSide: later.sides[1] });
    expect(describeKnockout(result, { ...context, resultAt }).turns).toBe(4);
    expect(describeKnockout(result, context).turns).toBeNull();
  });
});
