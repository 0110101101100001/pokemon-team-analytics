import { describe, expect, it } from 'vitest';
import { gmaxMoveFor } from './gmaxMoves';

describe('golpes G-Max', () => {
  it('liga cada forma Gigantamax ao seu golpe', () => {
    expect(gmaxMoveFor('charizard-gmax')).toMatchObject({ name: 'G-Max Wildfire', type: 'fire', power: null });
    expect(gmaxMoveFor('cinderace-gmax')).toMatchObject({ name: 'G-Max Fireball', power: 160 });
  });

  it('dá um golpe por estilo de Urshifu e um só para as duas Toxtricity', () => {
    expect(gmaxMoveFor('urshifu-single-strike-gmax').name).toBe('G-Max One Blow');
    expect(gmaxMoveFor('urshifu-rapid-strike-gmax').name).toBe('G-Max Rapid Flow');
    expect(gmaxMoveFor('toxtricity-amped-gmax')).toBe(gmaxMoveFor('toxtricity-low-key-gmax'));
  });

  it('não dá golpe G-Max a formas que não são Gigantamax', () => {
    expect(gmaxMoveFor('charizard')).toBeNull();
    expect(gmaxMoveFor('charizard-mega-x')).toBeNull();
    expect(gmaxMoveFor(null)).toBeNull();
  });
});
