import { describe, expect, it } from 'vitest';
import { breedingPartners, genderRatio, hatchInfo } from './breeding';

const entry = (name, eggGroups, isForm = false) => ({ name, species: name.split('-')[0], eggGroups, isForm });

const ENTRIES = [
  entry('bulbasaur', ['monster', 'plant']),
  entry('charmander', ['monster', 'dragon']),
  entry('oddish', ['plant']),
  entry('magnemite', ['mineral']),
  entry('geodude', ['mineral']),
  entry('ditto', ['ditto']),
  entry('mewtwo', ['no-eggs']),
  entry('charmander-fake', ['monster'], true),
];
const GENDERLESS = new Set(['magnemite', 'ditto', 'mewtwo']);

const partnersOf = (name, extra = {}) => {
  const self = ENTRIES.find((candidate) => candidate.name === name);
  return breedingPartners({
    speciesName: self.species, eggGroups: self.eggGroups, isGenderless: GENDERLESS.has(name), entries: ENTRIES, genderless: GENDERLESS, ...extra,
  });
};

describe('criação', () => {
  it('converte a proporção de gênero', () => {
    expect(genderRatio(1)).toEqual({ female: 12.5, male: 87.5 });
    expect(genderRatio(8)).toEqual({ female: 100, male: 0 });
    expect(genderRatio(-1)).toBeNull();
  });

  it('calcula os passos para chocar', () => {
    expect(hatchInfo(20)).toEqual({ cycles: 20, steps: 5100 });
    expect(hatchInfo(null)).toBeNull();
  });

  it('lista parceiros por grupo, sem formas, sem a própria espécie, sem Ditto e sem os sem gênero', () => {
    const { kind, groups } = partnersOf('bulbasaur');
    expect(kind).toBe('groups');
    expect(groups.map(({ group, partners }) => [group, partners.map((partner) => partner.name)])).toEqual([
      ['monster', ['charmander']],
      ['plant', ['oddish']],
    ]);
    expect(partnersOf('geodude').groups[0].partners).toEqual([]);
  });

  it('trata Undiscovered, Ditto e as espécies sem gênero', () => {
    expect(partnersOf('mewtwo').kind).toBe('none');
    expect(partnersOf('ditto').kind).toBe('everyone');
    expect(partnersOf('magnemite').kind).toBe('dittoOnly');
  });
});
