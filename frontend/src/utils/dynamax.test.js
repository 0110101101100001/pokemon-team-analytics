import { describe, expect, it } from 'vitest';
import { createField, createMoveSlot, createSideConditions, resolveSlot } from '../components/calc/calcState';
import battleData from '../data/battle-data.json';
import { gmaxMoveOf } from '../data/gmaxMoves';
import { moveSummaryOf } from './battleData';
import { calcSpeed, calculateDamage, describeKnockout, residualEffects } from './damage';
import { dynamaxed, toggleDynamax } from './dynamax';
import { simulateTurn } from './turn';

const NO_EFFECT = {
  target: 'selected-pokemon', category: null, statChanges: [], statChance: 0,
  ailment: null, ailmentChance: 0, healing: 0, drain: 0, flinchChance: 0,
};
const combatant = ({ stats, ...extra } = {}) => ({
  level: 100, types: ['normal'], tera: '', boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, item: '', ability: '', status: '',
  stats: { hp: 400, atk: 200, def: 200, spa: 200, spd: 200, spe: 200, ...stats }, ...extra,
});
const used = (slug, { mode = '', species, outcome, attacker = combatant(), field = createField(), effects = {} } = {}) => resolveSlot(
  { ...createMoveSlot({ ...moveSummaryOf(battleData, slug), effects: { ...NO_EFFECT, ...effects } }), mode, outcome },
  species ? gmaxMoveOf(species) : null,
  { attacker, field },
);
const gmax = (slug, species, outcome) => used(slug, { mode: 'gmax', species, outcome });
const hit = (move, { attacker = combatant(), defender = combatant(), conditions = createSideConditions() } = {}) =>
  calculateDamage({ attacker, defender, move, field: createField(), defenderSide: conditions });
const turn = (moves, combatants = [combatant(), combatant()], field = createField()) =>
  simulateTurn({ combatants, moves, sideConditions: field.sides, field, names: ['A', 'B'] });
/** Passa `count` turnos sem ninguém agir, levando o estado de um para o outro. */
function wait(first, count, combatants = [combatant(), combatant()]) {
  let current = first;
  const history = [];
  for (let index = 0; index < count; index += 1) {
    const next = combatants.map((own, side) => ({ ...own, ...current.sides[side] }));
    current = turn([null, null], next, { ...current.field, sides: current.conditions });
    history.push(current);
  }
  return history;
}

describe('Dynamax', () => {
  it('dobra os PS e volta pela metade, arredondando para cima', () => {
    const on = dynamaxed(combatant({ currentHp: 151 }));
    expect([on.stats.hp, on.currentHp, on.dynamax]).toEqual([800, 302, 3]);
    expect(toggleDynamax({ dynamax: 2, currentHp: 301 }, 400)).toMatchObject({ dynamax: 0, currentHp: 151 });
    expect(toggleDynamax({ dynamax: 0, currentHp: null }, 400)).toMatchObject({ dynamax: 3, currentHp: null });
  });

  it('Shedinja continua com 1 PS', () => {
    expect(dynamaxed(combatant({ species: 'shedinja', stats: { hp: 1 } })).stats.hp).toBe(1);
  });

  it('a porcentagem usa os PS dobrados', () => {
    const result = hit(used('return'), { defender: dynamaxed(combatant()) });
    expect(result.hp).toBe(800);
    expect(result.max).toBe(hit(used('return')).max);
  });

  it('em Dynamax o golpe de dano vira Max e o de status, Max Guard', () => {
    const attacker = dynamaxed(combatant());
    expect(used('return', { attacker }).name).toBe('Max Strike');
    expect(used('return', { attacker, mode: 'z' }).name).toBe('Max Strike');
    expect(used('swords-dance', { attacker })).toMatchObject({ slug: 'max-guard', priority: 4 });
  });

  it('depois que acaba, o Max escolhido volta a ser o golpe normal', () => {
    expect(used('return', { attacker: combatant({ dynamaxSpent: true }), mode: 'max' }).slug).toBe('return');
  });

  it('Choice Scarf não acelera', () => {
    const scarfed = combatant({ item: 'choice-scarf' });
    expect(calcSpeed(dynamaxed(scarfed), createSideConditions(), createField())).toBe(200);
  });

  it('usar um Max ativa o Dynamax, que dura 3 turnos', () => {
    const first = turn([used('return', { mode: 'max' }), null]);
    expect(first.sides[0]).toMatchObject({ dynamax: 2, currentHp: 800 });
    const [second, third] = wait(first, 2, [dynamaxed(combatant()), combatant()]);
    expect(second.sides[0].dynamax).toBe(1);
    expect(third.sides[0]).toMatchObject({ dynamax: 0, dynamaxSpent: true, currentHp: 400 });
  });

  it('o dano por turno usa os PS normais', () => {
    const burned = dynamaxed(combatant({ status: 'burn' }));
    expect(residualEffects(burned, createSideConditions(), createField()).perTurn).toBe(25);
  });

  it('Super Fang, peso, OHKO e Behemoth Blade seguem as regras do Dynamax', () => {
    const defender = dynamaxed(combatant({ weight: 100 }));
    expect(hit(used('super-fang'), { defender }).max).toBe(200);
    expect(hit(used('low-kick'), { defender }).reason).toMatch(/Dynamax/);
    expect(hit(used('fissure'), { defender }).reason).toMatch(/Dynamax/);
    expect(hit(used('behemoth-blade'), { defender }).max).toBeGreaterThan(hit(used('behemoth-blade')).max * 1.9);
  });

  it('o nocaute considera o fim do Dynamax', () => {
    const result = { rolls: Array(16).fill(250), hits: 1, hp: 800, min: 250, max: 250 };
    const context = (dynamax) => ({
      attacker: combatant(), defender: { ...dynamaxed(combatant()), dynamax }, defenderSide: createSideConditions(), field: createField(),
    });
    expect(describeKnockout(result, context(3)).turns).toBe(4);
    expect(describeKnockout(result, context(1)).turns).toBe(3);
  });

  it('Max Guard barra golpes Max, mas não G-Max One Blow', () => {
    const conditions = { ...createSideConditions(), protect: true, maxGuard: true };
    expect(hit(used('return', { mode: 'max' }), { conditions }).reason).toMatch(/Max Guard/);
    expect(hit(gmax('wicked-blow', 'urshifu-single-strike'), { conditions }).reason).toBeNull();
  });
});

describe('G-Max com duração', () => {
  it.each([
    ['flamethrower', 'charizard', 'fire'],
    ['energy-ball', 'venusaur', 'grass'],
    ['surf', 'blastoise', 'water'],
    ['rock-slide', 'coalossal', 'rock'],
  ])('%s de %s tira 1/6 por 4 turnos', (slug, species, immune) => {
    const first = turn([gmax(slug, species), null]);
    expect(first.conditions[1].gmaxDamage.turns).toBe(3);
    const history = wait(first, 4);
    const lost = [first, ...history].map((state, index, all) => (index ? all[index - 1].sides[1].currentHp - state.sides[1].currentHp : 66));
    expect(history[2].conditions[1].gmaxDamage).toBeNull();
    expect(lost[4]).toBe(0);
    const spared = residualEffects(combatant({ types: [immune] }), first.conditions[1], createField());
    expect(spared.timed).toEqual([]);
  });

  it.each([['', 4], ['5', 5]])('Centiferno com sorteio "%s" prende por %i turnos', (outcome, turns) => {
    const first = turn([gmax('flamethrower', 'centiskorch', outcome || undefined), null]);
    expect(first.sides[1].volatiles.trap.turns).toBe(turns - 1);
  });

  it('Meltdown impede repetir o golpe', () => {
    const tormented = combatant({ volatiles: { torment: 2, lastMove: 'return' } });
    const result = turn([used('return'), null], [tormented, combatant()]);
    expect(result.sides[1].currentHp).toBe(400);
    expect(result.log[0].text).toMatch(/repetir/);
  });

  it('Steelsurge fere na entrada pelo tipo Steel', () => {
    const side = { ...createSideConditions(), steelsurge: true };
    expect(residualEffects(combatant({ types: ['fairy'] }), side, createField()).entry).toBe(100);
  });
});

describe('G-Max com sorteio', () => {
  it.each([[undefined, 'poison'], ['paralysis', 'paralysis'], ['sleep', 'sleep']])('Befuddle "%s" causa %s', (outcome, status) => {
    expect(turn([gmax('bug-buzz', 'butterfree', outcome), null]).sides[1].status).toBe(status);
  });

  it.each([[undefined, 'paralysis'], ['poison', 'poison']])('Stun Shock "%s" causa %s', (outcome, status) => {
    expect(turn([gmax('thunderbolt', 'toxtricity-amped', outcome), null]).sides[1].status).toBe(status);
  });

  it('a imunidade por habilidade vale no sorteio', () => {
    const result = turn([gmax('bug-buzz', 'butterfree'), null], [combatant(), combatant({ ability: 'immunity' })]);
    expect(result.sides[1].status).toBe('');
  });

  it('Snooze adormece no fim do turno seguinte, se o sorteio acertar', () => {
    const first = turn([gmax('dark-pulse', 'grimmsnarl'), null]);
    expect(first.sides[1].status).toBe('');
    expect(wait(first, 1)[0].sides[1].status).toBe('sleep');
    expect(turn([gmax('dark-pulse', 'grimmsnarl', 'none'), null]).sides[1].volatiles.yawn).toBeFalsy();
  });

  it('confusão reduz o dano médio e fere o próprio usuário', () => {
    const confused = turn([used('return'), null], [combatant({ volatiles: { confusion: 2 } }), combatant()]);
    const clear = turn([used('return'), null]);
    expect(400 - confused.sides[1].currentHp).toBe(Math.round((400 - clear.sides[1].currentHp) * 0.67));
    expect(confused.sides[0].currentHp).toBeLessThan(400);
    expect(confused.sides[0].volatiles.confusion).toBe(1);
  });

  it('Gold Rush confunde; Own Tempo impede', () => {
    expect(turn([gmax('return', 'meowth'), null]).sides[1].volatiles.confusion).toBe(2);
    const immune = turn([gmax('return', 'meowth'), null], [combatant(), combatant({ ability: 'own-tempo' })]);
    expect(immune.sides[1].volatiles.confusion).toBeFalsy();
  });

  it('Cuddle corta o dano médio pela metade', () => {
    expect(turn([gmax('return', 'eevee'), null]).sides[1].volatiles.infatuated).toBe(true);
    const infatuated = turn([used('return'), null], [combatant({ volatiles: { infatuated: true } }), combatant()]);
    expect(400 - infatuated.sides[1].currentHp).toBe(Math.round((400 - turn([used('return'), null]).sides[1].currentHp) * 0.5));
  });

  it('Chi Strike acumula até o crítico garantido', () => {
    expect(turn([gmax('close-combat', 'machamp'), null]).sides[0].volatiles.critStage).toBe(1);
    expect(hit(used('return'), { attacker: combatant({ volatiles: { critStage: 3 } }) }).crit).toBe(true);
  });
});
