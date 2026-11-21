import { describe, expect, it } from 'vitest';
import { calculateDamage, isCalculable } from './damage';
import { hiddenPowerType, variablePower } from './variablePower';
import { createField, createSideConditions } from '../components/calc/calcState';

const NO_BOOSTS = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const side = (overrides = {}) => ({
  level: 100, types: ['normal'], originalTypes: ['normal'], tera: '', item: '', ability: '', status: '',
  stats: { hp: 300, atk: 200, def: 200, spa: 200, spd: 200, spe: 200 },
  boosts: NO_BOOSTS, weight: 50, currentHp: null, happiness: 255,
  ...overrides,
});
const power = (slug, context) => variablePower({ slug }, { attacker: side(), defender: side(), attackerSpeed: 200, defenderSpeed: 200, ...context }).power;

describe('golpes de poder variável', () => {
  it('Grass Knot e Low Kick pela faixa de peso do alvo', () => {
    const at = (weight) => power('grass-knot', { defender: side({ weight }) });
    expect([9.9, 10, 24.9, 25, 49.9, 50, 99.9, 100, 199.9, 200].map(at)).toEqual([20, 40, 40, 60, 60, 80, 80, 100, 100, 120]);
    expect(power('low-kick', { defender: side({ weight: 460 }) })).toBe(120);
  });

  it('Heavy Slam e Heat Crash pela razão de pesos', () => {
    const at = (user, target) => power('heavy-slam', { attacker: side({ weight: user }), defender: side({ weight: target }) });
    expect([at(500, 100), at(400, 100), at(300, 100), at(200, 100), at(199, 100)]).toEqual([120, 100, 80, 60, 40]);
    expect(power('heat-crash', { attacker: side({ weight: 100 }), defender: side({ weight: 100 }) })).toBe(40);
  });

  it('Gyro Ball e Electro Ball pela velocidade', () => {
    expect(power('gyro-ball', { attackerSpeed: 50, defenderSpeed: 400 })).toBe(150);
    expect(power('gyro-ball', { attackerSpeed: 100, defenderSpeed: 100 })).toBe(26);
    expect(power('electro-ball', { attackerSpeed: 400, defenderSpeed: 100 })).toBe(150);
    expect(power('electro-ball', { attackerSpeed: 150, defenderSpeed: 100 })).toBe(60);
    expect(power('electro-ball', { attackerSpeed: 90, defenderSpeed: 100 })).toBe(40);
  });

  it('PS atuais do usuário e do alvo', () => {
    expect(power('eruption', { attacker: side({ currentHp: null }) })).toBe(150);
    expect(power('water-spout', { attacker: side({ currentHp: 150 }) })).toBe(75);
    expect(power('flail', { attacker: side({ currentHp: 3 }) })).toBe(200);
    expect(power('reversal', { attacker: side({ currentHp: null }) })).toBe(20);
    expect(power('crush-grip', { defender: side({ currentHp: null }) })).toBe(120);
    expect(power('wring-out', { defender: side({ currentHp: 75 }) })).toBe(30);
  });

  it('felicidade, estágios e os demais', () => {
    expect(power('return', { attacker: side({ happiness: 255 }) })).toBe(102);
    expect(power('frustration', { attacker: side({ happiness: 0 }) })).toBe(102);
    expect(power('frustration', { attacker: side({ happiness: 255 }) })).toBe(1);
    expect(power('stored-power', { attacker: side({ boosts: { ...NO_BOOSTS, spa: 2, spd: 2, def: -1 } }) })).toBe(100);
    expect(power('punishment', { defender: side({ boosts: { ...NO_BOOSTS, atk: 6, spe: 6 } }) })).toBe(200);
    expect(power('hidden-power')).toBe(60);
    expect(power('beat-up', { attacker: side({ baseStats: { atk: 125 } }) })).toBe(17);
    expect(power('fling', { attackerItem: 'assault-vest' })).toBe(80);
    expect(variablePower({ slug: 'fling' }, { attackerItem: '' }).reason).toMatch(/sem item/);
    expect(variablePower({ slug: 'natural-gift' }, {}).reason).toBeTruthy();
  });

  it('Hidden Power troca de tipo pelos IVs', () => {
    const ivs = (overrides) => ({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...overrides });
    expect(hiddenPowerType(ivs())).toBe('dark');
    expect(hiddenPowerType(ivs({ atk: 30, def: 30 }))).toBe('ice');
    expect(hiddenPowerType(ivs({ atk: 30, spa: 30, spe: 30 }))).toBe('fire');
  });
});

describe('Grass Knot na calculadora', () => {
  const grassKnot = { slug: 'grass-knot', type: 'grass', damageClass: 'special', category: 'special', power: null, hits: 1, crit: false };
  const attacker = side({ types: ['grass'], originalTypes: ['grass'] });
  const hit = (weight) => calculateDamage({
    attacker,
    defender: side({ weight }),
    move: grassKnot,
    field: createField(),
    defenderSide: createSideConditions(),
  });

  it('entra na lista de golpes com dano', () => {
    expect(isCalculable(grassKnot)).toBe(true);
    expect(isCalculable({ ...grassKnot, category: 'status' })).toBe(false);
  });

  it('bate mais forte no Snorlax (460 kg) do que no Pidgey (1,8 kg)', () => {
    const pidgey = hit(1.8);
    const snorlax = hit(460);
    expect(pidgey.variablePower.power).toBe(20);
    expect(snorlax.variablePower.power).toBe(120);
    expect(snorlax.max).toBeGreaterThan(pidgey.max * 4);
  });

  it('sem o peso do alvo, explica em vez de calcular', () => {
    expect(hit(null).reason).toMatch(/peso/);
  });
});

describe('peso no teste do meta', async () => {
  const battleData = (await import('../data/battle-data.json')).default;
  const { gauntletMember } = await import('./gauntlet');
  const { createBattleSet } = await import('./stats');
  const member = (id, name) => gauntletMember({ id, name, types: ['normal'] }, createBattleSet(), battleData);

  it('vem da PokéAPI (battle-data.json) e chega no combatente', () => {
    expect(member(16, 'pidgey').combatant.weight).toBe(1.8);
    expect(member(143, 'snorlax').combatant.weight).toBe(460);
  });

  it('Grass Knot deixa de ser pulado: tem poder pelo peso do alvo', () => {
    const snorlax = member(143, 'snorlax').combatant;
    expect(variablePower({ slug: 'grass-knot' }, { attacker: snorlax, defender: snorlax }).power).toBe(120);
  });
});
