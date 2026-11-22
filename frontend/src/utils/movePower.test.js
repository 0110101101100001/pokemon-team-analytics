import { describe, expect, it } from 'vitest';
import { resolveSlot, sideFromPokemon } from '../components/calc/calcState';
import battleData from '../data/battle-data.json';
import { moveSummaryOf } from './battleData';
import { withMaxPower } from './movePower';
import { createBattleSet, normalizeBattleSet } from './stats';
import { trainerMemberSet } from './trainers';

describe.each(['return', 'frustration'])('%s sempre com o poder máximo', (slug) => {
  const saved = { slug, type: 'normal', damageClass: 'physical', power: null, priority: 0 };
  const sources = [
    ['time de treinador', () => trainerMemberSet({ level: 50, moves: [slug] }, (name) => moveSummaryOf(battleData, name))],
    ['time salvo direto na calculadora', () => ({ ...createBattleSet(), moves: [saved, null, null, null] })],
    ['time salvo aberto no Team Builder', () => normalizeBattleSet({ moves: [saved] })],
  ];

  it.each(sources)('%s: 102, e 160 como Breakneck Blitz', (_, setOf) => {
    const slot = sideFromPokemon({ id: 1 }, setOf()).moves[0];
    expect(resolveSlot(slot)).toMatchObject({ slug, power: 102 });
    expect(resolveSlot({ ...slot, mode: 'z' })).toMatchObject({ name: 'Breakneck Blitz', power: 160 });
  });
});

describe('withMaxPower', () => {
  it('não mexe nos outros golpes', () => {
    const gyroBall = { slug: 'gyro-ball', power: null };
    expect(withMaxPower(gyroBall)).toBe(gyroBall);
    expect(withMaxPower(null)).toBeNull();
  });
});
