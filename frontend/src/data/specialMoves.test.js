import { describe, expect, it } from 'vitest';
import { GMAX_MOVE_LIST } from './gmaxMoves';
import { MAX_MOVES } from './maxMoves';
import { EXCLUSIVE_Z_MOVES, GENERIC_Z_MOVES, zMovesFor } from './zMoves';
import { specialMovesOf } from '../components/moves/SpecialMoves';

describe('golpes Z', () => {
  it('tem um golpe Z por tipo', () => {
    expect(new Set(GENERIC_Z_MOVES.map((move) => move.type)).size).toBe(18);
  });

  it('liga os exclusivos às formas certas', () => {
    expect(zMovesFor('pikachu').map((move) => move.name)).toEqual(['Catastropika']);
    expect(zMovesFor('pikachu-alola-cap').map((move) => move.name)).toEqual(['10,000,000 Volt Thunderbolt']);
    expect(zMovesFor('necrozma-dusk').map((move) => move.name)).toEqual(['Searing Sunraze Smash']);
    expect(zMovesFor('raichu')).toEqual([]);
    expect(EXCLUSIVE_Z_MOVES).toHaveLength(17);
  });
});

describe('golpes Max e G-Max', () => {
  it('tem um golpe Max por tipo, mais Max Guard', () => {
    expect(MAX_MOVES).toHaveLength(19);
  });

  it('lista os 33 golpes G-Max com as formas que os usam', () => {
    expect(GMAX_MOVE_LIST).toHaveLength(33);
    expect(GMAX_MOVE_LIST.find((move) => move.species === 'toxtricity').users)
      .toEqual(['toxtricity-amped-gmax', 'toxtricity-low-key-gmax']);
    expect(GMAX_MOVE_LIST.find((move) => move.species === 'charizard').users).toEqual(['charizard-gmax']);
  });

  it('filtra as abas por nome e tipo', () => {
    const fire = specialMovesOf('max', { term: '', type: 'fire' });
    expect(fire.first.map((move) => move.name)).toEqual(['G-Max Wildfire', 'G-Max Fireball', 'G-Max Centiferno']);
    expect(fire.second.map((move) => move.name)).toEqual(['Max Flare']);
    expect(specialMovesOf('z', { term: 'sunraze', type: '' }).first.map((move) => move.name)).toEqual(['Searing Sunraze Smash']);
  });
});
