import { describe, expect, it } from 'vitest';
import { MEGAS, filterMegas, megaDebutLabel, megaGeneration } from './megas';

const byName = (name) => MEGAS.find((mega) => mega.name === name);

describe('Megas', () => {
  it('liga cada Mega à pedra e à forma base', () => {
    expect(byName('charizard-mega-x')).toMatchObject({ base: 'charizard', stone: 'charizardite-x', types: ['fire', 'dragon'] });
    expect(byName('kyogre-primal')).toMatchObject({ stone: 'blue-orb', isPrimal: true });
    expect(byName('rayquaza-mega').stone).toBeNull();
  });

  it('calcula a diferença de atributos para a forma base', () => {
    const mega = byName('charizard-mega-x');
    expect(mega.total - mega.baseTotal).toBe(100);
    expect(mega.typesChanged).toBe(true);
    expect(byName('venusaur-mega').typesChanged).toBe(false);
  });

  it('separa as Megas de X / Y das de Legends: Z-A', () => {
    expect(megaGeneration('charizard-mega-x')).toBe(6);
    expect(megaGeneration('raichu-mega-x')).toBe(9);
    expect(megaDebutLabel(9)).toBe('9ª geração · Legends: Z-A');
    expect(megaGeneration('charizard')).toBeNull();
  });

  it('filtra por Pokémon, pedra e tipo', () => {
    expect(filterMegas(MEGAS, { term: 'charizardite', type: '' }).map((mega) => mega.name)).toEqual(['charizard-mega-x', 'charizard-mega-y']);
    expect(filterMegas(MEGAS, { term: 'charizard', type: 'dragon' }).map((mega) => mega.name)).toEqual(['charizard-mega-x']);
  });
});
