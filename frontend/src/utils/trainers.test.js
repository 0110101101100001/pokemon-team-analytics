import { describe, expect, it } from 'vitest';
import {
  MIXED_TYPE, battleGroupsOf, battleLabel, hasTeamVariants, battleTabsOf, teamVariantsOf, createNameMatcher, gamesOf, groupTrainers, matchingBattles, moveSlug, resolveTrainerPokemon,
  trainerMemberSet, trainerSpriteUrl, gameLabelsOf, gameListOf, regionGeneration, regionsOf, unknownTrainerValues,
} from './trainers';

const row = (fields) => ({
  card_id: `${fields.trainer_slug}-${fields.generation}-${fields.role}`,
  generation: 1,
  region: 'Kanto',
  games_label: 'Red / Blue',
  battle_stage: 'Main Story',
  role: 'Gym Leader',
  order: 1,
  specialty_type: 'Poison',
  battle_gimmick: 'None',
  team_json: [{ slug: 'koffing', pokemon: 'Koffing', level: 37, moves: ['Smog'], is_ace: false }],
  ...fields,
});

const ROWS = [
  row({ trainer_slug: 'koga', trainer_name: 'Koga', order: 5 }),
  row({ trainer_slug: 'koga', trainer_name: 'Koga', generation: 2, region: 'Johto', games_label: 'Gold / Silver', role: 'Elite Four', order: 2 }),
  row({ trainer_slug: 'brock', trainer_name: 'Brock', specialty_type: 'Rock' }),
  row({ trainer_slug: 'lance', trainer_name: 'Lance', generation: 2, region: 'Johto', role: 'Champion', specialty_type: 'Dragon' }),
  row({ trainer_slug: 'blue', trainer_name: 'Blue', role: 'Champion', specialty_type: 'Multi-type', team_variant: 'Squirtle' }),
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

  it('monta o sprite do Showdown com o trainer_slug sem alterações', () => {
    expect(trainerSpriteUrl('arven-s')).toBe('https://play.pokemonshowdown.com/sprites/trainers/arven-s.png');
    expect(trainerSpriteUrl('nemona-s')).toBe('https://play.pokemonshowdown.com/sprites/trainers/nemona-s.png');
  });

  it('rotula a batalha com a etapa, sem o jogo nem a variante do time', () => {
    expect(battleLabel(bySlug('blue').battles[0])).toBe('batalha');
    const [steven] = groupTrainers([
      row({ trainer_slug: 'steven', trainer_name: 'Steven', games_label: 'Emerald', role: 'Former Champion', battle_stage: 'Post-Game' }),
    ]);
    expect(battleLabel(steven.battles[0])).toBe('pós-jogo');
  });

  it('marca a batalha em dupla', () => {
    const [wally] = groupTrainers([
      row({ trainer_slug: 'wally', trainer_name: 'Wally', games_label: 'Omega Ruby / Alpha Sapphire', role: 'Rival', battle_stage: 'Post-Game', multi_battle: true }),
    ]);
    expect(battleLabel(wally.battles[0])).toBe('batalha em dupla · pós-jogo');
    const [gladion] = groupTrainers([1, 4].map((order) => row({
      trainer_slug: 'gladion', trainer_name: 'Gladion', games_label: 'Sun / Moon', role: 'Rival', order: order,
      card_id: `gladion-${order}`, multi_battle: order === 4,
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
    trainer_slug: 'gary', trainer_name: 'Gary', role: 'Rival', team_variant: variant,
    card_id: `gary-${fields.location ?? 'route-22'}-${variant}`, location: 'Route 22', ...fields,
  });
  const [gary] = groupTrainers(['Bulbasaur', 'Charmander', 'Squirtle'].flatMap((variant) => [
    variantRow(variant),
    variantRow(variant, { location: 'Indigo Plateau', order: 2 }),
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
        card_id: `rb-${variant}`, trainer_slug: 'blue', trainer_name: 'Blue', role: 'Rival', team_variant: variant, location: 'Route 22',
      })),
      ...['Flareon', 'Jolteon'].map((variant) => row({
        card_id: `y-${variant}`, trainer_slug: 'blue', trainer_name: 'Blue', role: 'Rival', team_variant: variant, location: 'Silph Co.', games_label: 'Yellow',
      })),
      row({ card_id: 'y-lab', trainer_slug: 'blue', trainer_name: 'Blue', role: 'Rival', location: 'Route 22', games_label: 'Yellow', order: 2 }),
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
      card_id: location, trainer_slug: 'arven', trainer_name: 'Arven', generation: 9, games_label: 'Scarlet / Violet', role: 'Rival', location: location,
    })));
    expect(battleTabsOf(arven.battles).map((tab) => tab.label)).toEqual([
      'batalha · Asado Desert',
      'batalha · Casseroya Lake',
    ]);
  });

  it('separa pela ordem revanches no mesmo lugar', () => {
    const [barry] = groupTrainers([1, 2].map((order) => row({
      card_id: `rematch-${order}`, trainer_slug: 'barry', trainer_name: 'Barry', generation: 4, games_label: 'Diamond / Pearl',
      battle_stage: 'Rematch', role: 'Rival', location: 'Fight Area', order: order,
    })));
    expect(battleTabsOf(barry.battles).map((tab) => tab.label)).toEqual(['revanche · 1ª', 'revanche · 2ª']);
  });
});


describe('jogos na ficha do treinador', () => {
  it('agrupa pelo rótulo do jogo, em ordem de lançamento', () => {
    expect(gameLabelsOf(bySlug('koga').battles)).toEqual(['Red / Blue', 'Gold / Silver']);
  });

  it('separa os jogos do games_json, sem repetir, em ordem de lançamento', () => {
    const [cheren] = groupTrainers([
      row({ card_id: 'b2w2', trainer_slug: 'cheren', trainer_name: 'Cheren', generation: 5, games_label: 'Black 2 / White 2', games_json: ['Black 2', 'White 2'] }),
      row({ card_id: 'bw', trainer_slug: 'cheren', trainer_name: 'Cheren', generation: 5, games_label: 'Black / White', games_json: ['Black', 'White'], role: 'Rival' }),
      row({ card_id: 'w', trainer_slug: 'cheren', trainer_name: 'Cheren', generation: 5, games_label: 'White', games_json: ['White'], role: 'Rival', order: 2 }),
    ]);
    expect(gameListOf(cheren.battles)).toEqual(['Black', 'White', 'Black 2', 'White 2']);
  });

  it('marca o Challenge Mode na aba, sem repetir o jogo', () => {
    const [cheren] = groupTrainers(['Black 2 / White 2', 'Black 2 / White 2 – Challenge Mode'].map((label) => row({
      card_id: label, trainer_slug: 'cheren', trainer_name: 'Cheren', generation: 5, games_label: label, games_json: ['Black 2', 'White 2'],
    })));
    expect(battleTabsOf(cheren.battles).map((tab) => tab.label)).toEqual(['batalha', 'Challenge Mode']);
  });
});

describe('ordem das batalhas na ficha', () => {
  const marnieRow = (id, stage, role, order) => row({
    card_id: id, trainer_slug: 'marnie', trainer_name: 'Marnie', generation: 8, region: 'Galar',
    games_label: 'Sword / Shield', battle_stage: stage, role: role, order: order,
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
      card_id: variant, trainer_slug: 'blue', trainer_name: 'Blue', role: 'Champion', location: 'Indigo Plateau', team_variant: variant,
    })));
    expect(summary(groups)).toEqual([['Red / Blue · História · Indigo Plateau · Campeão', ['Bulbasaur', 'Charmander', 'Squirtle']]]);
  });

  it('ordena por geração, etapa (história, revanche, pós-jogo) e ordem', () => {
    const rival = (fields) => row({ trainer_slug: 'silver', trainer_name: 'Silver', role: 'Rival', generation: 4, games_label: 'HeartGold / SoulSilver', ...fields });
    const groups = groupsOf([
      rival({ card_id: 'pos', battle_stage: 'Post-Game', order: 1, location: 'Mt. Silver' }),
      rival({ card_id: 'rev', battle_stage: 'Rematch', order: 7, location: 'Indigo Plateau' }),
      rival({ card_id: 'den', order: 7, location: "Dragon's Den" }),
      rival({ card_id: 'gsc', generation: 2, games_label: 'Gold / Silver / Crystal', order: 1, location: 'Cherrygrove City' }),
    ]);
    expect(groups.map((group) => group.variants[0].id)).toEqual(['gsc', 'den', 'rev', 'pos']);
  });

  it('filtra pelo jogo e tira o jogo do rótulo', () => {
    const blue = (games, location, order) => row({
      card_id: `${games}-${order}`, trainer_slug: 'blue', trainer_name: 'Blue', role: 'Rival', games_label: games, location: location, order: order,
    });
    const [trainer] = groupTrainers([blue('Red / Blue', 'Cerulean City', 3), blue('Yellow', 'Route 22', 2), blue('Red / Blue', 'Route 22', 2)]);
    expect(gameLabelsOf(trainer.battles)).toEqual(['Red / Blue', 'Yellow']);
    expect(battleGroupsOf(trainer, 'Red / Blue').map((group) => group.label)).toEqual(['História · Route 22 · Rival', 'História · Cerulean City · Rival']);
    expect(battleGroupsOf(trainer, 'Yellow').map((group) => group.label)).toEqual(['História · Route 22 · Rival']);
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
      card_id: variant, trainer_slug: 'misty', trainer_name: 'Misty', generation: 5, games_label: 'Black 2 / White 2',
      battle_stage: 'Post-Game', order: order, location: 'Pokémon World Tournament', team_variant: variant,
    });
    expect(summary(groupsOf([pwt('Kanto Leaders', 1), pwt('World Leaders', 2)]))).toEqual([
      ['Black 2 / White 2 · Pós-jogo · Pokémon World Tournament · Líder de Ginásio · Kanto Leaders', []],
      ['Black 2 / White 2 · Pós-jogo · Pokémon World Tournament · Líder de Ginásio · World Leaders', []],
    ]);

    const cup = (stage, order) => row({
      card_id: `${stage}-${order}`, trainer_slug: 'marnie', trainer_name: 'Marnie', generation: 8, games_label: 'Sword / Shield',
      battle_stage: stage, order: order, role: 'Champion Cup', location: 'Champion Cup',
    });
    expect(summary(groupsOf([cup('Main Story', 3), cup('Rematch', 2)]))).toEqual([
      ['Sword / Shield · História · Champion Cup · Copa dos Campeões', []],
      ['Sword / Shield · Revanche · Champion Cup · Copa dos Campeões', []],
    ]);
  });

  it('diz que é revanche mesmo quando é a única batalha ou o local é outro', () => {
    const brock = (fields) => row({ trainer_slug: 'brock', trainer_name: 'Brock', games_label: 'HeartGold / SoulSilver', ...fields });
    const rematch = brock({ card_id: 'rev', battle_stage: 'Rematch', location: 'Fighting Dojo' });
    const labels = (rows) => battleGroupsOf(groupTrainers(rows)[0], 'HeartGold / SoulSilver').map((group) => group.label);
    expect(labels([rematch])).toEqual(['Revanche · Fighting Dojo · Líder de Ginásio']);
    expect(labels([brock({ card_id: 'gym', location: 'Pewter Gym' }), rematch])[1]).toMatch(/^Revanche/);
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
    row({ trainer_slug: 'giovanni', trainer_name: 'Giovanni', role: 'Team Rocket', order: 1, location: 'Rocket Hideout' }),
    row({ trainer_slug: 'giovanni', trainer_name: 'Giovanni', role: 'Gym Leader', order: 3, location: 'Viridian City' }),
    row({ trainer_slug: 'brock', trainer_name: 'Brock', order: 1 }),
    row({ trainer_slug: 'blaine', trainer_name: 'Blaine', order: 7 }),
    row({ trainer_slug: 'lorelei', trainer_name: 'Lorelei', role: 'Elite Four', order: 1 }),
  ]).map((trainer) => trainer.slug);

  it('põe o líder de ginásio que também é vilão logo depois dos líderes comuns', () => {
    expect(kanto).toEqual(['brock', 'blaine', 'giovanni', 'lorelei']);
  });

  it('separa as equipes vilãs, com o chefe antes dos subordinados', () => {
    const hoenn = groupTrainers([
      row({ trainer_slug: 'shelly', trainer_name: 'Shelly', generation: 3, role: 'Team Aqua' }),
      row({ trainer_slug: 'archie-gen6', trainer_name: 'Archie', generation: 3, role: 'Team Aqua' }),
      row({ trainer_slug: 'courtney', trainer_name: 'Courtney', generation: 3, role: 'Team Magma' }),
      row({ trainer_slug: 'maxie-gen6', trainer_name: 'Maxie', generation: 3, role: 'Team Magma' }),
      row({ trainer_slug: 'novo', trainer_name: 'Aaa', generation: 3, role: 'Papel Novo' }),
    ]).map((trainer) => trainer.slug);
    expect(hoenn).toEqual(['maxie-gen6', 'courtney', 'archie-gen6', 'shelly', 'novo']);
  });

  it('ordena as facções de Hisui', () => {
    const hisui = ['Miss Fortunes', 'Ginkgo Guild', 'Galaxy Team', 'Pearl Clan', 'Diamond Clan']
      .map((role, index) => row({ trainer_slug: `t${index}`, trainer_name: role, generation: 8, role: role }));
    expect(groupTrainers(hisui).map((trainer) => trainer.name))
      .toEqual(['Diamond Clan', 'Pearl Clan', 'Galaxy Team', 'Ginkgo Guild', 'Miss Fortunes']);
  });

  it('ordena as variantes de time por fase, não pelo alfabeto', () => {
    const variants = (names) => groupTrainers(names.map((name) => row({ trainer_slug: 'x', trainer_name: 'X', team_variant: name, card_id: name })))[0]
      .battles.map((battle) => battle.teamVariant);
    expect(variants(['Subsequent clears', 'Fourth clear', 'Second clear', 'First clear', 'Third clear']))
      .toEqual(['First clear', 'Second clear', 'Third clear', 'Fourth clear', 'Subsequent clears']);
    expect(variants(['After The Way Home', 'Before The Way Home'])).toEqual(['Before The Way Home', 'After The Way Home']);
  });
});

describe('unknownTrainerValues', () => {
  it('não acusa nada quando tudo está mapeado', () => {
    expect(unknownTrainerValues(ROWS)).toEqual({});
  });

  it('lista por coluna o que o front não conhece', () => {
    const rows = [
      row({ trainer_slug: 'a', region: 'Orre', role: 'Cipher', games_label: 'Colosseum', battle_gimmick: 'Shadow' }),
      row({ trainer_slug: 'b', region: 'Orre', battle_stage: 'Epilogue' }),
    ];
    expect(unknownTrainerValues(rows)).toEqual({
      region: ['Orre'], role: ['Cipher'], battle_gimmick: ['Shadow'], battle_stage: ['Epilogue'], games_json: ['Colosseum'],
    });
  });
});
