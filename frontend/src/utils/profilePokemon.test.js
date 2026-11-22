import { describe, expect, it } from 'vitest';
import { isProfilePokemonId } from './profilePokemon';

describe('isProfilePokemonId', () => {
  it('aceita de 1 a 1025', () => {
    expect([1, 25, 1025].every(isProfilePokemonId)).toBe(true);
  });

  it('recusa fora da faixa, fração, texto e vazio', () => {
    expect([0, 1026, -3, 2.5, '25', null, undefined, Number.NaN].some(isProfilePokemonId)).toBe(false);
  });
});
