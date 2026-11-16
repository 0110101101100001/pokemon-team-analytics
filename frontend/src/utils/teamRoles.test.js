import { describe, expect, it } from 'vitest';
import { META } from './sketchFixtures';
import { ROLE_USAGE_CUTOFF, rolesOf } from './teamRoles';

const stat = (fields) => ({ moves: {}, items: {}, abilities: {}, ...fields });

describe('rolesOf', () => {
  it('só conta golpes usados em pelo menos 30% dos sets', () => {
    expect(ROLE_USAGE_CUTOFF).toBe(30);
    expect([...rolesOf(stat({ moves: { 'Stealth Rock': 30, 'Rapid Spin': 29.9 } }))]).toEqual(['hazards']);
  });

  it('Sticky Web é Hazards e Speed Control', () => {
    expect(rolesOf(stat({ moves: { 'Sticky Web': 80 } }))).toEqual(new Set(['hazards', 'speedControl']));
  });

  it('Wish cura o time e recupera', () => {
    expect(rolesOf(stat({ moves: { Wish: 60 } }))).toEqual(new Set(['recovery', 'cleric']));
  });

  it('habilidade de clima marca o setter', () => {
    expect(rolesOf(stat({ abilities: { Drizzle: 99.6 } }))).toEqual(new Set(['weather:rain']));
    expect(rolesOf(stat({ abilities: { 'Orichalcum Pulse': 100 } }))).toEqual(new Set(['weather:sun']));
    expect(rolesOf(stat({ abilities: { 'Sand Stream': 10 } }))).toEqual(new Set());
  });

  it('Choice Scarf ≥ 30% é Speed Control; Band ou Specs, Wallbreaker', () => {
    expect(rolesOf(stat({ items: { 'Choice Scarf': 31 } }))).toEqual(new Set(['speedControl']));
    expect(rolesOf(stat({ items: { 'Choice Scarf': 20, 'Choice Band': 45 } }))).toEqual(new Set(['wallbreaker']));
  });

  it('atributo ofensivo base ≥ 120 também faz wallbreaker', () => {
    expect(rolesOf(stat({}), { hp: 100, atk: 120, def: 80, spa: 60, spd: 80, spe: 90 }).has('wallbreaker')).toBe(true);
    expect(rolesOf(stat({}), { hp: 100, atk: 119, def: 80, spa: 119, spd: 80, spe: 90 }).has('wallbreaker')).toBe(false);
  });

  it('attachRoles liga as funções às entradas da Pokédex', () => {
    expect(META.roles.get('corviknight')).toEqual(new Set(['pivot', 'removal', 'recovery']));
    expect(META.roles.get('pelipper')).toEqual(new Set(['pivot', 'recovery', 'weather:rain']));
    expect(META.roles.has('mewtwo')).toBe(false);
    expect(META.baseStats.get('hatterene').spe).toBe(29);
    expect(META.attackTypes.get('barraskewda').has('water')).toBe(true);
  });
});
