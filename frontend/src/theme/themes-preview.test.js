// A prévia de cada tema (Configurações → Aparência) mostra o próprio Pokémon: número, tipos e descrição.
import { describe, expect, it } from 'vitest';
import { THEMES } from './themes';

const TYPES = new Set([
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]);

describe.each(THEMES)('prévia do tema $id', (theme) => {
  it('tem o Pokémon do tema, com número e um ou dois tipos válidos', () => {
    expect(Number.isInteger(theme.pokemon.number) && theme.pokemon.number > 0).toBe(true);
    expect(theme.pokemon.types.length).toBeGreaterThanOrEqual(1);
    expect(theme.pokemon.types.length).toBeLessThanOrEqual(2);
    theme.pokemon.types.forEach((type) => expect(TYPES.has(type), type).toBe(true));
  });

  it('tem uma descrição de frase inteira, sem passar de uma linha e meia no cartão', () => {
    expect(theme.description).toMatch(/^[A-ZÀ-Ú].+\.$/);
    expect(theme.description.length).toBeLessThanOrEqual(90);
  });
});

it('cada tema mostra um Pokémon diferente', () => {
  const numbers = THEMES.map((theme) => theme.pokemon.number);
  expect(new Set(numbers).size).toBe(numbers.length);
});
