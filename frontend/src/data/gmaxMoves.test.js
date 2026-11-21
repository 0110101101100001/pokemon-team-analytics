import { describe, expect, it } from 'vitest';
import { gmaxMoveFor, gmaxMoveOf } from './gmaxMoves';

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

describe('gmaxMoveOf', () => {
  it('acha o G-Max pela forma base que Gigantamaxiza', () => {
    expect(gmaxMoveOf('charizard')?.name).toBe('G-Max Wildfire');
    expect(gmaxMoveOf('toxtricity-low-key')?.name).toBe('G-Max Stun Shock');
    expect(gmaxMoveOf('urshifu-rapid-strike')?.name).toBe('G-Max Rapid Flow');
    expect(gmaxMoveOf('charizard-gmax')?.name).toBe('G-Max Wildfire');
  });

  it('ignora espécies e formas sem Gigantamax', () => {
    expect(gmaxMoveOf('charizard-mega-x')).toBeNull();
    expect(gmaxMoveOf('meowth-galar')).toBeNull();
    expect(gmaxMoveOf('dragonite')).toBeNull();
    expect(gmaxMoveOf(null)).toBeNull();
  });
});
