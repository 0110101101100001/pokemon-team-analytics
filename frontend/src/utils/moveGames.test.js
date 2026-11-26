import { describe, expect, it } from 'vitest';
import { MOVE_GAMES, activeMoveGame, gamesWithMoves, groupByGeneration, versionGroupsOf } from './moveGames';

const move = (...groups) => ({ version_group_details: groups.map((name) => ({ version_group: { name } })) });

describe('moveGames', () => {
  it('cada version group aparece em um jogo só', () => {
    const groups = MOVE_GAMES.flatMap((game) => game.groups);
    expect(new Set(groups).size).toBe(groups.length);
  });

  it('só lista os jogos em que o Pokémon tem golpes, do mais novo ao mais antigo', () => {
    const games = gamesWithMoves([move('sword-shield', 'scarlet-violet'), move('x-y'), move('red-blue')]);
    expect(games.map((game) => game.value)).toEqual(['scarlet-violet', 'sword-shield', 'x-y', 'red-blue']);
  });

  it('a DLC conta como o jogo base, e o nome do BDSP é o da PokéAPI', () => {
    expect(gamesWithMoves([move('the-teal-mask')]).map((game) => game.value)).toEqual(['scarlet-violet']);
    expect(gamesWithMoves([move('the-crown-tundra')]).map((game) => game.value)).toEqual(['sword-shield']);
    expect(gamesWithMoves([move('brilliant-diamond-shining-pearl')]).map((game) => game.value)).toEqual(['brilliant-diamond-shining-pearl']);
    expect(versionGroupsOf('scarlet-violet')).toEqual(['scarlet-violet', 'the-teal-mask', 'the-indigo-disk']);
  });

  it('com `methods`, um jogo só conta se tiver golpes desses jeitos de aprender', () => {
    const learned = (group, method) => ({ version_group_details: [{ version_group: { name: group }, move_learn_method: { name: method } }] });
    const moves = [learned('champions', 'train'), learned('scarlet-violet', 'level-up'), learned('legends-arceus', 'tutor')];
    const methods = new Set(['level-up', 'machine', 'egg']);
    expect(gamesWithMoves(moves, methods).map((game) => game.value)).toEqual(['scarlet-violet']);
    expect(gamesWithMoves(moves).map((game) => game.value)).toEqual(['champions', 'scarlet-violet', 'legends-arceus']);
  });

  it('sem golpes ou com version groups desconhecidos, não há jogos', () => {
    expect(gamesWithMoves([])).toEqual([]);
    expect(gamesWithMoves(undefined)).toEqual([]);
    expect(gamesWithMoves([move('jogo-futuro')])).toEqual([]);
  });

  it('mantém a escolha se o Pokémon estiver no jogo; senão, o mais novo', () => {
    const games = gamesWithMoves([move('sword-shield'), move('x-y')]);
    expect(activeMoveGame(games, 'x-y')).toBe('x-y');
    expect(activeMoveGame(games, 'scarlet-violet')).toBe('sword-shield');
    expect(activeMoveGame(games, null)).toBe('sword-shield');
    expect(activeMoveGame([], 'x-y')).toBeNull();
  });

  it('agrupa por geração na ordem da lista', () => {
    const groups = groupByGeneration(gamesWithMoves([move('scarlet-violet'), move('legends-arceus'), move('sword-shield'), move('x-y')]));
    expect(groups.map((group) => [group.generation, group.games.map((game) => game.value)])).toEqual([
      [9, ['scarlet-violet']],
      [8, ['legends-arceus', 'sword-shield']],
      [6, ['x-y']],
    ]);
  });
});
