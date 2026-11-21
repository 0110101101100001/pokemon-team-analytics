import { describe, expect, it } from 'vitest';
import { boostedSpeed, buildSpeedTiers, placeSpeed, speedStat, tierLevel, topSpread } from './speedTiers';

describe('velocidade', () => {
  it('calcula com natureza, EVs e nível', () => {
    expect(speedStat(102, { nature: 'jolly', ev: 252 }, 100)).toBe(333); // Garchomp
    expect(speedStat(102, { nature: 'hardy', ev: 252 }, 100)).toBe(303);
    expect(speedStat(30, { nature: 'brave', ev: 0, iv: 0 }, 100)).toBe(58);
  });

  it('joga a Little Cup no nível 5', () => {
    expect(tierLevel('gen9lc')).toBe(5);
    expect(tierLevel('gen9ou')).toBe(100);
  });

  it('aplica Scarf e Tailwind arredondando a cada passo', () => {
    expect(boostedSpeed(333, { scarf: true })).toBe(499);
    expect(boostedSpeed(333, { tailwind: true })).toBe(666);
    expect(boostedSpeed(333, { scarf: true, tailwind: true })).toBe(998);
  });

  it('usa o spread mais usado que estiver no formato', () => {
    expect(topSpread({ Other: 50, 'Timid:0/0/4/252/0/252': 20, 'Bold:252/0/252/0/4/0': 30 })).toEqual({ nature: 'bold', ev: 0 });
    expect(topSpread({})).toBeNull();
  });
});

describe('tabela do meta', () => {
  const POKEDEX = {
    'Great Tusk': { entryName: 'great-tusk', id: 984, baseSpeed: 87 },
    Kingambit: { entryName: 'kingambit', id: 983, baseSpeed: 50 },
    'Dragapult': { entryName: 'dragapult', id: 887, baseSpeed: 142 },
  };
  const rows = [
    { name: 'Great Tusk', usage_percent: 30, spreads: { 'Jolly:0/252/4/0/0/252': 40 }, items: { 'Choice Scarf': 2 } },
    { name: 'Desconhecido', usage_percent: 25, spreads: {}, items: {} },
    { name: 'Kingambit', usage_percent: 20, spreads: { 'Adamant:112/252/0/0/0/144': 50 }, items: {} },
    { name: 'Dragapult', usage_percent: 10, spreads: {}, items: { 'Choice Scarf': 12 } },
  ];
  const tiers = buildSpeedTiers(rows, (name) => POKEDEX[name] ?? null, 100, 3);

  it('pula quem não está na Pokédex e ordena do mais rápido ao mais lento', () => {
    expect(tiers.map((tier) => [tier.entryName, tier.speed])).toEqual([
      ['dragapult', 421], ['great-tusk', 300], ['kingambit', 172],
    ]);
  });

  it('só mostra o Scarf de quem o usa com frequência', () => {
    expect(tiers.map((tier) => tier.scarfSpeed)).toEqual([631, null, null]);
  });

  it('conta quem fica para trás, empata e passa na frente', () => {
    expect(placeSpeed(tiers, 300)).toEqual({ outspeeds: 1, ties: 1, outspedBy: 1 });
  });
});
