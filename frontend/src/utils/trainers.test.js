import { describe, expect, it } from 'vitest';
import {
  MIXED_TYPE, battleLabel, createNameMatcher, groupTrainers, matchingBattles, moveSlug, resolveTrainerPokemon,
  trainerMemberSet, trainerSpriteUrl,
} from './trainers';

const row = (fields) => ({
  Card_ID: `${fields.Trainer_Slug}-${fields.Generation}-${fields.Role}`,
  Generation: 1,
  Region: 'Kanto',
  Games_Label: 'Red / Blue',
  Battle_Stage: 'Main Story',
  Role: 'Gym Leader',
  Order: 1,
  Specialty_Type: 'Poison',
  Battle_Gimmick: 'None',
  Team_JSON: [{ slug: 'koffing', pokemon: 'Koffing', level: 37, moves: ['Smog'], is_ace: false }],
  ...fields,
});

const ROWS = [
  row({ Trainer_Slug: 'koga', Trainer_Name: 'Koga', Order: 5 }),
  row({ Trainer_Slug: 'koga', Trainer_Name: 'Koga', Generation: 2, Region: 'Johto', Games_Label: 'Gold / Silver', Role: 'Elite Four', Order: 2 }),
  row({ Trainer_Slug: 'brock', Trainer_Name: 'Brock', Specialty_Type: 'Rock' }),
  row({ Trainer_Slug: 'lance', Trainer_Name: 'Lance', Generation: 2, Region: 'Johto', Role: 'Champion', Specialty_Type: 'Dragon' }),
  row({ Trainer_Slug: 'blue', Trainer_Name: 'Blue', Role: 'Champion', Specialty_Type: 'Multi-type', Team_Variant: 'Squirtle' }),
];

const trainers = groupTrainers(ROWS);
const bySlug = (slug) => trainers.find((trainer) => trainer.slug === slug);

describe('groupTrainers', () => {
  it('junta as batalhas do mesmo treinador e ordena pelo caminho dos jogos', () => {
    expect(trainers.map((trainer) => trainer.slug)).toEqual(['brock', 'koga', 'blue', 'lance']);
    expect(bySlug('koga').battles.map((battle) => battle.role)).toEqual(['Gym Leader', 'Elite Four']);
    expect(bySlug('koga').regions).toEqual(['Kanto', 'Johto']);
  });

  it('trata Multi-type como especialidade mista', () => {
    expect(bySlug('blue').type).toBe(MIXED_TYPE);
    expect(bySlug('brock').type).toBe('rock');
  });
});

describe('matchingBattles', () => {
  it('soma as opções dentro de um grupo (ou)', () => {
    const filters = { role: ['Elite Four', 'Champion'] };
    expect(trainers.filter((trainer) => matchingBattles(trainer, filters).length).map((t) => t.slug))
      .toEqual(['koga', 'blue', 'lance']);
  });

  it('exige todos os grupos na mesma batalha', () => {
    expect(matchingBattles(bySlug('koga'), { region: ['Kanto'], role: ['Elite Four'] })).toEqual([]);
    expect(matchingBattles(bySlug('koga'), { region: ['Johto'], role: ['Elite Four'] })).toHaveLength(1);
  });

  it('sem filtros devolve todas as batalhas', () => {
    expect(matchingBattles(bySlug('koga'), { region: [] })).toHaveLength(2);
  });

  it('filtra tipo, inclusive a especialidade mista', () => {
    expect(matchingBattles(bySlug('lance'), { region: ['Johto'], type: ['dragon'] })).toHaveLength(1);
    expect(matchingBattles(bySlug('blue'), { type: [MIXED_TYPE] })).toHaveLength(1);
  });
});

describe('detalhes', () => {
  it('busca pelo nome sem acento nem caixa', () => {
    expect(createNameMatcher('BRÓ')(bySlug('brock'))).toBe(true);
    expect(createNameMatcher('  ')(bySlug('brock'))).toBe(true);
  });

  it('monta o sprite do Showdown sem hífens, com exceções', () => {
    expect(trainerSpriteUrl('crasher-wake')).toMatch(/\/crasherwake\.png$/);
    expect(trainerSpriteUrl('phoebe')).toMatch(/\/phoebe-gen6\.png$/);
  });

  it('rotula a variante com jogo, time e revanche', () => {
    expect(battleLabel(bySlug('blue').battles[0])).toBe('Red / Blue · Squirtle');
  });
});

describe('time do treinador na calculadora', () => {
  it('converte o nome do golpe no slug da PokéAPI', () => {
    expect(moveSlug('Will-O-Wisp')).toBe('will-o-wisp');
    expect(moveSlug("King's Shield")).toBe('kings-shield');
    expect(moveSlug('Power Up Punch')).toBe('power-up-punch');
  });

  it('monta o set com o nível e os golpes, deixando vazio o que não existe', () => {
    const summaries = { flail: { slug: 'flail' }, surf: { slug: 'surf' } };
    const set = trainerMemberSet({ level: 44, moves: ['Fla', 'Surf'] }, (slug) => summaries[slug] ?? null);
    expect(set.level).toBe(44);
    expect(set.moves).toEqual([null, { slug: 'surf' }, null, null]);
  });

  it('resolve a espécie para a forma padrão da Pokédex', () => {
    const entries = new Map([['onix', { id: 95 }], ['aegislash-shield', { id: 681 }], ['aegislash-blade', { id: 10026 }]]);
    expect(resolveTrainerPokemon(entries, 'onix').id).toBe(95);
    expect(resolveTrainerPokemon(entries, 'aegislash').id).toBe(681);
    expect(resolveTrainerPokemon(entries, 'missingno')).toBeNull();
  });
});
