import { describe, expect, it } from 'vitest';
import { TYPE_CHART, TYPE_NAMES, defensiveProfile, effectiveness, isTypeName, offensiveProfile } from './typeChart';

describe('TYPE_CHART', () => {
  it('tem os 18 tipos, cada linha com os 18 defensores e só 0, ½, 1 ou 2', () => {
    expect(TYPE_NAMES).toHaveLength(18);
    for (const attack of TYPE_NAMES) {
      expect(Object.keys(TYPE_CHART[attack])).toEqual(TYPE_NAMES);
      for (const value of Object.values(TYPE_CHART[attack])) expect([0, 0.5, 1, 2]).toContain(value);
    }
  });

  it('a tabela da geração atual tem 51 super efetivos, 61 resistências e 8 imunidades', () => {
    const all = TYPE_NAMES.flatMap((attack) => Object.values(TYPE_CHART[attack]));
    expect(all.filter((value) => value === 2)).toHaveLength(51);
    expect(all.filter((value) => value === 0.5)).toHaveLength(61);
    expect(all.filter((value) => value === 0)).toHaveLength(8);
  });

  it('isTypeName aceita só os 18 tipos', () => {
    expect(isTypeName('fire')).toBe(true);
    expect(isTypeName('stellar')).toBe(false);
    expect(isTypeName('toString')).toBe(false);
  });
});

describe('effectiveness', () => {
  it.each([
    ['electric', ['ground'], 0],
    ['normal', ['ghost'], 0],
    ['ghost', ['normal'], 0],
    ['dragon', ['fairy'], 0],
    ['poison', ['steel'], 0],
    ['psychic', ['dark'], 0],
    ['fighting', ['ghost'], 0],
    ['ground', ['flying'], 0],
    ['ice', ['dragon', 'flying'], 4],
    ['rock', ['fire', 'flying'], 4],
    ['grass', ['water', 'ground'], 4],
    ['fire', ['grass', 'steel'], 4],
    ['steel', ['fairy'], 2],
    ['fairy', ['dragon', 'dark'], 4],
    ['electric', ['water', 'ground'], 0],
    ['ice', ['dragon', 'flying'], 4],
    ['dragon', ['steel', 'fairy'], 0],
    ['normal', ['rock'], 0.5],
    ['normal', ['steel'], 0.5],
    ['normal', ['rock', 'steel'], 0.25],
  ])('%s contra %j = %s', (attack, defenders, expected) => {
    expect(effectiveness(attack, defenders)).toBe(expected);
  });

  it('tipo desconhecido é neutro', () => {
    expect(effectiveness('stellar', ['fire'])).toBe(1);
    expect(effectiveness('fire', ['???'])).toBe(1);
  });
});

describe('defensiveProfile', () => {
  it('Water/Ground: 4× Grass, imune a Electric e cada atacante em um grupo só', () => {
    const profile = defensiveProfile(['water', 'ground']);
    expect(profile.x4).toEqual(['grass']);
    expect(profile.x0).toEqual(['electric']);
    expect(profile.x2).toEqual([]);
    expect(profile.x05).toEqual(['fire', 'poison', 'rock', 'steel']);
    const all = Object.values(profile).flat();
    expect([...all].sort()).toEqual([...TYPE_NAMES].sort());
  });

  it('Dragon/Flying recebe 4× de Ice; Steel/Fairy é imune a Dragon e Poison', () => {
    expect(defensiveProfile(['dragon', 'flying']).x4).toEqual(['ice']);
    expect(defensiveProfile(['steel', 'fairy']).x0).toEqual(['poison', 'dragon']);
  });

  it('com um tipo só, não há 4× nem ¼×', () => {
    const profile = defensiveProfile(['normal']);
    expect(profile.x4).toEqual([]);
    expect(profile.x025).toEqual([]);
    expect(profile.x2).toEqual(['fighting']);
    expect(profile.x0).toEqual(['ghost']);
  });
});

describe('offensiveProfile', () => {
  it('Fire: super efetivo em Grass, Ice, Bug e Steel; sem imunidades', () => {
    expect(offensiveProfile('fire')).toEqual({
      superEffective: ['grass', 'ice', 'bug', 'steel'],
      notVery: ['fire', 'water', 'rock', 'dragon'],
      noEffect: [],
    });
  });

  it('Ground não afeta Flying; Normal não afeta Ghost', () => {
    expect(offensiveProfile('ground').noEffect).toEqual(['flying']);
    expect(offensiveProfile('normal').noEffect).toEqual(['ghost']);
  });
});
