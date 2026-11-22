import { describe, expect, it } from 'vitest';
import { searchProfiles } from './profileSearch';

const species = [[2, 'ivysaur'], [25, 'pikachu'], [122, 'mr-mime'], [250, 'ho-oh'], [669, 'flabebe']]
  .map(([number, name]) => ({ number, species: name }));
const found = (query) => searchProfiles(species, query).map((entry) => entry.number);

describe('searchProfiles', () => {
  it('acha pelo nome sem ligar para acento, caixa e pontuação', () => {
    expect(found('Mr. Mime')).toEqual([122]);
    expect(found('Flabébé')).toEqual([669]);
  });

  it('põe o número exato na frente', () => {
    expect(found('#025')).toEqual([25, 250]);
    expect(found('2')).toEqual([2, 25, 250]);
  });

  it('busca vazia traz todos; só símbolos, nenhum', () => {
    expect(found('  ')).toHaveLength(species.length);
    expect(found('###')).toEqual([]);
  });
});
