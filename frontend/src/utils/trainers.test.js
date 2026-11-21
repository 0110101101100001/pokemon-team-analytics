import { describe, expect, it } from 'vitest';
import {
  MIXED_TYPE, battleGroupsOf, battleLabel, hasTeamVariants, battleTabsOf, teamVariantsOf, createNameMatcher, gamesOf, groupTrainers, matchingBattles, moveSlug, resolveTrainerPokemon,
  trainerMemberSet, trainerSpriteUrl, gameLabelsOf, gameListOf, regionGeneration, regionsOf,
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

  it('filtra por jogo individual dentro do rótulo', () => {
    expect(matchingBattles(bySlug('koga'), { game: ['Blue'] }).map((battle) => battle.role)).toEqual(['Gym Leader']);
    expect(matchingBattles(bySlug('koga'), { game: ['Silver', 'Yellow'] }).map((battle) => battle.role)).toEqual(['Elite Four']);
  });

  it('lista os jogos em ordem de lançamento', () => {
    expect(gamesOf(trainers)).toEqual(['Red', 'Blue', 'Gold', 'Silver']);
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

  it('monta o sprite do Showdown com o Trainer_Slug sem alterações', () => {
    expect(trainerSpriteUrl('arven-s')).toBe('https://play.pokemonshowdown.com/sprites/trainers/arven-s.png');
    expect(trainerSpriteUrl('nemona-s')).toBe('https://play.pokemonshowdown.com/sprites/trainers/nemona-s.png');
  });

  it('rotula a batalha com a etapa, sem o jogo nem a variante do time', () => {
    expect(battleLabel(bySlug('blue').battles[0])).toBe('batalha');
    const [steven] = groupTrainers([
      row({ Trainer_Slug: 'steven', Trainer_Name: 'Steven', Games_Label: 'Emerald', Role: 'Former Champion', Battle_Stage: 'Post-Game' }),
    ]);
    expect(battleLabel(steven.battles[0])).toBe('pós-jogo');
  });

  it('marca a batalha em dupla', () => {
    const [wally] = groupTrainers([
      row({ Trainer_Slug: 'wally', Trainer_Name: 'Wally', Games_Label: 'Omega Ruby / Alpha Sapphire', Role: 'Rival', Battle_Stage: 'Post-Game', Multi_Battle: true }),
    ]);
    expect(battleLabel(wally.battles[0])).toBe('batalha em dupla · pós-jogo');
    const [gladion] = groupTrainers([1, 4].map((order) => row({
      Trainer_Slug: 'gladion', Trainer_Name: 'Gladion', Games_Label: 'Sun / Moon', Role: 'Rival', Order: order,
      Card_ID: `gladion-${order}`, Multi_Battle: order === 4,
    })));
    expect(gladion.battles.map(battleLabel)).toEqual(['1ª batalha', '4ª batalha em dupla']);
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

describe('variantes do time', () => {
  const variantRow = (variant, fields = {}) => row({
    Trainer_Slug: 'gary', Trainer_Name: 'Gary', Role: 'Rival', Team_Variant: variant,
    Card_ID: `gary-${fields.Location ?? 'route-22'}-${variant}`, Location: 'Route 22', ...fields,
  });
  const [gary] = groupTrainers(['Bulbasaur', 'Charmander', 'Squirtle'].flatMap((variant) => [
    variantRow(variant),
    variantRow(variant, { Location: 'Indigo Plateau', Order: 2 }),
  ]));

  it('conta cada confronto uma vez, não uma por variante', () => {
    expect(gary.battles).toHaveLength(6);
    expect(gary.battleCount).toBe(2);
    expect(teamVariantsOf(gary.battles)).toEqual(['Bulbasaur', 'Charmander', 'Squirtle']);
  });

  it('numera os confrontos repetidos no mesmo jogo, mas não o líder de cada jogo', () => {
    expect(gary.battles.map((battle) => battle.sequence)).toEqual([1, 1, 1, 2, 2, 2]);
    expect(bySlug('koga').battles.map((battle) => battle.sequence)).toEqual([null, null]);
  });

  it('faz uma aba por batalha, com as variantes do time dentro dela', () => {
    const tabs = battleTabsOf(gary.battles);
    expect(tabs.map((tab) => tab.label)).toEqual(['1ª batalha', '2ª batalha']);
    expect(tabs.map((tab) => tab.variants.map((battle) => battle.teamVariant))).toEqual([
      ['Bulbasaur', 'Charmander', 'Squirtle'],
      ['Bulbasaur', 'Charmander', 'Squirtle'],
    ]);
    expect(tabs.every(hasTeamVariants)).toBe(true);
  });

  it('não mistura variantes de batalhas diferentes nem mostra seletor sem variante', () => {
    const [blue] = groupTrainers([
      ...['Bulbasaur', 'Squirtle'].map((variant) => row({
        Card_ID: `rb-${variant}`, Trainer_Slug: 'blue', Trainer_Name: 'Blue', Role: 'Rival', Team_Variant: variant, Location: 'Route 22',
      })),
      ...['Flareon', 'Jolteon'].map((variant) => row({
        Card_ID: `y-${variant}`, Trainer_Slug: 'blue', Trainer_Name: 'Blue', Role: 'Rival', Team_Variant: variant, Location: 'Silph Co.', Games_Label: 'Yellow',
      })),
      row({ Card_ID: 'y-lab', Trainer_Slug: 'blue', Trainer_Name: 'Blue', Role: 'Rival', Location: 'Route 22', Games_Label: 'Yellow', Order: 2 }),
    ]);
    const tabs = battleTabsOf(blue.battles);
    expect(tabs.map((tab) => [tab.label, hasTeamVariants(tab) ? tab.variants.map((battle) => battle.teamVariant) : []])).toEqual([
      ['batalha', ['Bulbasaur', 'Squirtle']],
      ['1ª batalha', ['Flareon', 'Jolteon']],
      ['2ª batalha', []],
    ]);
  });

  it('separa pelo local confrontos com o mesmo rótulo', () => {
    const [arven] = groupTrainers(['Asado Desert', 'Casseroya Lake'].map((location) => row({
      Card_ID: location, Trainer_Slug: 'arven', Trainer_Name: 'Arven', Generation: 9, Games_Label: 'Scarlet / Violet', Role: 'Rival', Location: location,
    })));
    expect(battleTabsOf(arven.battles).map((tab) => tab.label)).toEqual([
      'batalha · Asado Desert',
      'batalha · Casseroya Lake',
    ]);
  });

  it('separa pela ordem revanches no mesmo lugar', () => {
    const [barry] = groupTrainers([1, 2].map((order) => row({
      Card_ID: `rematch-${order}`, Trainer_Slug: 'barry', Trainer_Name: 'Barry', Generation: 4, Games_Label: 'Diamond / Pearl',
      Battle_Stage: 'Rematch', Role: 'Rival', Location: 'Fight Area', Order: order,
    })));
    expect(battleTabsOf(barry.battles).map((tab) => tab.label)).toEqual(['revanche · 1ª', 'revanche · 2ª']);
  });
});


describe('jogos na ficha do treinador', () => {
  it('agrupa pelo rótulo do jogo, em ordem de lançamento', () => {
    expect(gameLabelsOf(bySlug('koga').battles)).toEqual(['Red / Blue', 'Gold / Silver']);
  });

  it('separa os jogos do Games_JSON, sem repetir, em ordem de lançamento', () => {
    const [cheren] = groupTrainers([
      row({ Card_ID: 'b2w2', Trainer_Slug: 'cheren', Trainer_Name: 'Cheren', Generation: 5, Games_Label: 'Black 2 / White 2', Games_JSON: ['Black 2', 'White 2'] }),
      row({ Card_ID: 'bw', Trainer_Slug: 'cheren', Trainer_Name: 'Cheren', Generation: 5, Games_Label: 'Black / White', Games_JSON: ['Black', 'White'], Role: 'Rival' }),
      row({ Card_ID: 'w', Trainer_Slug: 'cheren', Trainer_Name: 'Cheren', Generation: 5, Games_Label: 'White', Games_JSON: ['White'], Role: 'Rival', Order: 2 }),
    ]);
    expect(gameListOf(cheren.battles)).toEqual(['Black', 'White', 'Black 2', 'White 2']);
  });

  it('marca o Challenge Mode na aba, sem repetir o jogo', () => {
    const [cheren] = groupTrainers(['Black 2 / White 2', 'Black 2 / White 2 – Challenge Mode'].map((label) => row({
      Card_ID: label, Trainer_Slug: 'cheren', Trainer_Name: 'Cheren', Generation: 5, Games_Label: label, Games_JSON: ['Black 2', 'White 2'],
    })));
    expect(battleTabsOf(cheren.battles).map((tab) => tab.label)).toEqual(['batalha', 'Challenge Mode']);
  });
});

describe('ordem das batalhas na ficha', () => {
  const marnieRow = (id, stage, role, order) => row({
    Card_ID: id, Trainer_Slug: 'marnie', Trainer_Name: 'Marnie', Generation: 8, Region: 'Galar',
    Games_Label: 'Sword / Shield', Battle_Stage: stage, Role: role, Order: order,
  });
  const [marnie] = groupTrainers([
    marnieRow('first', 'Main Story', 'Rival', 1),
    marnieRow('rematch', 'Rematch', 'Rival', 1),
    marnieRow('second', 'Main Story', 'Rival', 2),
    marnieRow('champion-tournaments', 'Rematch', 'Champion Cup', 2),
    marnieRow('star-tournament-rematch', 'Rematch', 'Champion Cup', 3),
    marnieRow('third', 'Main Story', 'Champion Cup', 3),
  ]);

  it('segue etapa e ordem na história, não o papel', () => {
    expect(marnie.battles.map((battle) => battle.id)).toEqual([
      'first', 'second', 'third', 'rematch', 'champion-tournaments', 'star-tournament-rematch',
    ]);
    expect(marnie.battles.map(battleLabel)).toEqual([
      '1ª batalha', '2ª batalha', 'batalha',
      'revanche', 'revanche', 'revanche',
    ]);
  });
});

describe('batalhas na calculadora', () => {
  const groupsOf = (rows) => battleGroupsOf(groupTrainers(rows)[0]);
  const summary = (groups) => groups.map((group) => [group.label, hasTeamVariants(group) ? group.variants.map((battle) => battle.teamVariant) : []]);
  const starters = ['Squirtle', 'Bulbasaur', 'Charmander'];

  it('junta as variantes de inicial em uma batalha e começa pela primeira', () => {
    const groups = groupsOf(starters.map((variant) => row({
      Card_ID: variant, Trainer_Slug: 'blue', Trainer_Name: 'Blue', Role: 'Champion', Location: 'Indigo Plateau', Team_Variant: variant,
    })));
    expect(summary(groups)).toEqual([['Red / Blue · Indigo Plateau · Campeão', ['Bulbasaur', 'Charmander', 'Squirtle']]]);
  });

  it('ordena por geração, etapa (história, revanche, pós-jogo) e ordem', () => {
    const rival = (fields) => row({ Trainer_Slug: 'silver', Trainer_Name: 'Silver', Role: 'Rival', Generation: 4, Games_Label: 'HeartGold / SoulSilver', ...fields });
    const groups = groupsOf([
      rival({ Card_ID: 'pos', Battle_Stage: 'Post-Game', Order: 1, Location: 'Mt. Silver' }),
      rival({ Card_ID: 'rev', Battle_Stage: 'Rematch', Order: 7, Location: 'Indigo Plateau' }),
      rival({ Card_ID: 'den', Order: 7, Location: "Dragon's Den" }),
      rival({ Card_ID: 'gsc', Generation: 2, Games_Label: 'Gold / Silver / Crystal', Order: 1, Location: 'Cherrygrove City' }),
    ]);
    expect(groups.map((group) => group.variants[0].id)).toEqual(['gsc', 'den', 'rev', 'pos']);
  });

  it('filtra pelo jogo e tira o jogo do rótulo', () => {
    const blue = (games, location, order) => row({
      Card_ID: `${games}-${order}`, Trainer_Slug: 'blue', Trainer_Name: 'Blue', Role: 'Rival', Games_Label: games, Location: location, Order: order,
    });
    const [trainer] = groupTrainers([blue('Red / Blue', 'Cerulean City', 3), blue('Yellow', 'Route 22', 2), blue('Red / Blue', 'Route 22', 2)]);
    expect(gameLabelsOf(trainer.battles)).toEqual(['Red / Blue', 'Yellow']);
    expect(battleGroupsOf(trainer, 'Red / Blue').map((group) => group.label)).toEqual(['Route 22 · Rival', 'Cerulean City · Rival']);
    expect(battleGroupsOf(trainer, 'Yellow').map((group) => group.label)).toEqual(['Route 22 · Rival']);
  });

  it("põe Let's Go antes de Sword / Shield", () => {
    const labels = gameLabelsOf([
      { games: 'Sword / Shield', gameList: ['Sword', 'Shield'] },
      { games: "Let's Go, Pikachu! / Let's Go, Eevee!", gameList: ["Let's Go, Pikachu!", "Let's Go, Eevee!"] },
    ]);
    expect(labels[0]).toMatch(/^Let's Go/);
  });

  it('separa batalhas de mesmo rótulo só com o que as distingue', () => {
    const pwt = (variant, order) => row({
      Card_ID: variant, Trainer_Slug: 'misty', Trainer_Name: 'Misty', Generation: 5, Games_Label: 'Black 2 / White 2',
      Battle_Stage: 'Post-Game', Order: order, Location: 'Pokémon World Tournament', Team_Variant: variant,
    });
    expect(summary(groupsOf([pwt('Kanto Leaders', 1), pwt('World Leaders', 2)]))).toEqual([
      ['Black 2 / White 2 · Pokémon World Tournament · Líder de Ginásio · Kanto Leaders', []],
      ['Black 2 / White 2 · Pokémon World Tournament · Líder de Ginásio · World Leaders', []],
    ]);

    const cup = (stage, order) => row({
      Card_ID: `${stage}-${order}`, Trainer_Slug: 'marnie', Trainer_Name: 'Marnie', Generation: 8, Games_Label: 'Sword / Shield',
      Battle_Stage: stage, Order: order, Role: 'Champion Cup', Location: 'Champion Cup',
    });
    expect(summary(groupsOf([cup('Main Story', 3), cup('Rematch', 2)]))).toEqual([
      ['Sword / Shield · Champion Cup · Copa dos Campeões', []],
      ['Sword / Shield · Champion Cup · Copa dos Campeões · revanche', []],
    ]);
  });
});

describe('regionsOf', () => {
  it('ordena as regiões pela estreia, com Hisui e Kitakami, e põe uma região desconhecida no fim', () => {
    const battles = ['Kitakami', 'Atlantis', 'Paldea', 'Hisui', 'Galar', 'Kanto'].map((region) => ({ region }));
    expect(regionsOf(battles)).toEqual(['Kanto', 'Galar', 'Hisui', 'Paldea', 'Kitakami', 'Atlantis']);
  });

  it('dá a geração de cada região', () => {
    expect(regionGeneration('Hisui')).toBe(8);
    expect(regionGeneration('Kitakami')).toBe(9);
    expect(regionGeneration('Atlantis')).toBeNull();
  });
});

describe('ordem dos cards', () => {
  const kanto = groupTrainers([
    row({ Trainer_Slug: 'giovanni', Trainer_Name: 'Giovanni', Role: 'Team Rocket', Order: 1, Location: 'Rocket Hideout' }),
    row({ Trainer_Slug: 'giovanni', Trainer_Name: 'Giovanni', Role: 'Gym Leader', Order: 3, Location: 'Viridian City' }),
    row({ Trainer_Slug: 'brock', Trainer_Name: 'Brock', Order: 1 }),
    row({ Trainer_Slug: 'blaine', Trainer_Name: 'Blaine', Order: 7 }),
    row({ Trainer_Slug: 'lorelei', Trainer_Name: 'Lorelei', Role: 'Elite Four', Order: 1 }),
  ]).map((trainer) => trainer.slug);

  it('põe o líder de ginásio que também é vilão logo depois dos líderes comuns', () => {
    expect(kanto).toEqual(['brock', 'blaine', 'giovanni', 'lorelei']);
  });

  it('separa as equipes vilãs, com o chefe antes dos subordinados', () => {
    const hoenn = groupTrainers([
      row({ Trainer_Slug: 'shelly', Trainer_Name: 'Shelly', Generation: 3, Role: 'Team Aqua' }),
      row({ Trainer_Slug: 'archie-gen6', Trainer_Name: 'Archie', Generation: 3, Role: 'Team Aqua' }),
      row({ Trainer_Slug: 'courtney', Trainer_Name: 'Courtney', Generation: 3, Role: 'Team Magma' }),
      row({ Trainer_Slug: 'maxie-gen6', Trainer_Name: 'Maxie', Generation: 3, Role: 'Team Magma' }),
      row({ Trainer_Slug: 'novo', Trainer_Name: 'Aaa', Generation: 3, Role: 'Papel Novo' }),
    ]).map((trainer) => trainer.slug);
    expect(hoenn).toEqual(['maxie-gen6', 'courtney', 'archie-gen6', 'shelly', 'novo']);
  });

  it('ordena as facções de Hisui', () => {
    const hisui = ['Miss Fortunes', 'Ginkgo Guild', 'Galaxy Team', 'Pearl Clan', 'Diamond Clan']
      .map((role, index) => row({ Trainer_Slug: `t${index}`, Trainer_Name: role, Generation: 8, Role: role }));
    expect(groupTrainers(hisui).map((trainer) => trainer.name))
      .toEqual(['Diamond Clan', 'Pearl Clan', 'Galaxy Team', 'Ginkgo Guild', 'Miss Fortunes']);
  });

  it('ordena as variantes de time por fase, não pelo alfabeto', () => {
    const variants = (names) => groupTrainers(names.map((name) => row({ Trainer_Slug: 'x', Trainer_Name: 'X', Team_Variant: name, Card_ID: name })))[0]
      .battles.map((battle) => battle.teamVariant);
    expect(variants(['Subsequent clears', 'Fourth clear', 'Second clear', 'First clear', 'Third clear']))
      .toEqual(['First clear', 'Second clear', 'Third clear', 'Fourth clear', 'Subsequent clears']);
    expect(variants(['After The Way Home', 'Before The Way Home'])).toEqual(['Before The Way Home', 'After The Way Home']);
  });
});
