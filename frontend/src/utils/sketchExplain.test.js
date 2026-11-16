import { describe, expect, it } from 'vitest';
import { itemNote, rolePhrases } from './sketchExplain';

// Gholdengo no OU: Nasty Plot e Choice Scarf em sets diferentes, SpA base 133.
const GHOLDENGO_STAT = {
  items: { 'Choice Scarf': 38, 'Air Balloon': 35 },
  moves: { 'Nasty Plot': 55, Recover: 50, 'Make It Rain': 99 },
  abilities: { 'Good as Gold': 100 },
};
const GHOLDENGO_ROLES = new Set(['speedControl', 'setup', 'wallbreaker', 'recovery']);
const BASE_STATS = { atk: 60, spa: 133 };

describe('rolePhrases', () => {
  it('justifica cada função pelo set exibido e marca a que vem de outro set', () => {
    const set = { item: 'air-balloon', ability: 'good-as-gold', moves: [{ slug: 'nasty-plot' }, { slug: 'recover' }, { slug: 'make-it-rain' }] };
    expect(rolePhrases(GHOLDENGO_ROLES, { set, smogonStat: GHOLDENGO_STAT, baseStats: BASE_STATS })).toEqual([
      'Speed Control (Choice Scarf em outros sets)',
      'Setup Sweeper (Nasty Plot)',
      'Wallbreaker (SpA base 133)',
      'Recovery (Recover)',
    ]);
  });

  it('com Choice Scarf no set, Speed Control vem do item', () => {
    const set = { item: 'choice-scarf', moves: [{ slug: 'make-it-rain' }] };
    expect(rolePhrases(new Set(['speedControl']), { set, smogonStat: GHOLDENGO_STAT })).toEqual(['Speed Control (Choice Scarf)']);
  });

  it('setter de clima vem com a habilidade', () => {
    const set = { ability: 'drought', moves: [] };
    expect(rolePhrases(new Set(['weather:sun']), { set })).toEqual(['Sun Setter (Drought)']);
  });

  it('Pivot vira Slow ou Fast Pivot pela velocidade base, e Teleport é sempre Slow', () => {
    const uTurn = { moves: [{ slug: 'u-turn' }] };
    const teleport = { moves: [{ slug: 'teleport' }] };
    const pivot = new Set(['pivot']);
    expect(rolePhrases(pivot, { set: uTurn, baseStats: { atk: 120, spa: 40, spe: 142 } })).toEqual(['Fast Pivot (U-turn)']);
    expect(rolePhrases(pivot, { set: uTurn, baseStats: { atk: 90, spa: 40, spe: 67 } })).toEqual(['Slow Pivot (U-turn)']);
    expect(rolePhrases(pivot, { set: uTurn, baseStats: { atk: 90, spa: 40, spe: 90 } })).toEqual(['Pivot (U-turn)']);
    expect(rolePhrases(pivot, { set: teleport, baseStats: { atk: 90, spa: 40, spe: 110 } })).toEqual(['Slow Pivot (Teleport)']);
  });
});

describe('itemNote', () => {
  it('descreve Air Balloon e ignora itens comuns', () => {
    expect(itemNote({ item: 'air-balloon' })).toBe('Air Balloon (entra imune a Ground)');
    expect(itemNote({ item: 'leftovers' })).toBeNull();
  });
});
