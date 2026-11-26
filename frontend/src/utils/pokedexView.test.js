import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import battleData from '../data/battle-data.json';
import {
  DEFAULT_VIEW_STATE, SORTS, VIEW_STORAGE_KEY, normalizeViewState, paramsWithViewState, readStoredViewState,
  sortEntries, sortNeedsStats, statsOf, viewStateFromParams, writeStoredViewState,
} from './pokedexView';

const baseStats = {
  1: [45, 49, 49, 65, 65, 45], // bulbasaur 318
  6: [78, 84, 78, 109, 85, 100], // charizard 534
  25: [35, 55, 40, 50, 50, 90], // pikachu 320
  10034: [78, 130, 111, 130, 85, 100], // charizard-mega-x 634
};
const list = [
  { id: 1, number: 1, name: 'bulbasaur' },
  { id: 6, number: 6, name: 'charizard' },
  { id: 10034, number: 6, name: 'charizard-mega-x' },
  { id: 25, number: 25, name: 'pikachu' },
  { id: 9999, number: 999, name: 'sem-dados' },
];
const names = (entries) => entries.map((entry) => entry.name);

describe('sortEntries', () => {
  it('Nº mantém a ordem da própria lista (Pokédex, ou a da coleção)', () => {
    const recentFirst = [list[3], list[0]];
    expect(sortEntries(recentFirst, 'number', baseStats)).toBe(recentFirst);
  });

  it('nome A–Z e Z–A', () => {
    expect(names(sortEntries(list, 'name', null))).toEqual(['bulbasaur', 'charizard', 'charizard-mega-x', 'pikachu', 'sem-dados']);
    expect(names(sortEntries(list, 'name-desc', null))[0]).toBe('sem-dados');
  });

  it('atributo: maior primeiro, sem dados no fim, sem mexer na lista original', () => {
    const copy = [...list];
    expect(names(sortEntries(list, 'total', baseStats))).toEqual(['charizard-mega-x', 'charizard', 'pikachu', 'bulbasaur', 'sem-dados']);
    expect(names(sortEntries(list, 'speed', baseStats)).slice(0, 2)).toEqual(['charizard', 'charizard-mega-x']); // empate: número, depois id
    expect(list).toEqual(copy);
  });

  it('sem os atributos carregados, a ordem por atributo espera (devolve a lista)', () => {
    expect(sortEntries(list, 'hp', null)).toBe(list);
  });
});

describe('estado da visualização', () => {
  it('valores inválidos viram o padrão', () => {
    expect(normalizeViewState({ sort: 'xyz', view: 'mosaico' })).toEqual(DEFAULT_VIEW_STATE);
    expect(normalizeViewState({ sort: 'speed', view: 'list' })).toEqual({ sort: 'speed', view: 'list' });
  });

  it('a URL manda no que traz; valor inválido vira o padrão; sem parâmetro, vale a escolha guardada', () => {
    expect(viewStateFromParams(new URLSearchParams('sort=speed&view=list'))).toEqual({ sort: 'speed', view: 'list' });
    expect(viewStateFromParams(new URLSearchParams('sort=hackeado&view=list'))).toEqual({ sort: 'number', view: 'list' });
    expect(viewStateFromParams(new URLSearchParams(''))).toEqual({});
  });

  it('padrões saem da URL; os outros parâmetros (ficha, conta) ficam', () => {
    const params = new URLSearchParams('pokemon=pikachu&sort=speed');
    expect(paramsWithViewState(params, { sort: 'number', view: 'list' }).toString()).toBe('pokemon=pikachu&view=list');
    expect(paramsWithViewState(params, DEFAULT_VIEW_STATE).toString()).toBe('pokemon=pikachu');
  });

  it('guarda e lê do localStorage, tolerando lixo e bloqueio', () => {
    const data = new Map();
    const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    writeStoredViewState(storage, { sort: 'hp', view: 'list' });
    expect(JSON.parse(data.get(VIEW_STORAGE_KEY))).toEqual({ sort: 'hp', view: 'list' });
    expect(readStoredViewState(storage)).toEqual({ sort: 'hp', view: 'list' });
    data.set(VIEW_STORAGE_KEY, '{quebrado');
    expect(readStoredViewState(storage)).toEqual(DEFAULT_VIEW_STATE);
    const blocked = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(readStoredViewState(blocked)).toEqual(DEFAULT_VIEW_STATE);
    expect(() => writeStoredViewState(blocked, DEFAULT_VIEW_STATE)).not.toThrow();
  });

  it('só as ordens por atributo precisam dos atributos', () => {
    expect(SORTS.filter((sort) => sortNeedsStats(sort.value)).map((sort) => sort.value))
      .toEqual(['total', 'hp', 'attack', 'defense', 'sp-attack', 'sp-defense', 'speed']);
  });

  it('statsOf soma o total', () => {
    expect(statsOf(baseStats, 25)).toEqual({ hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90, total: 320 });
    expect(statsOf(baseStats, 404)).toBeNull();
  });
});

// Se falhar: rode `node scripts/build-base-stats.mjs` (na raiz) depois de atualizar o battle-data.json.
it('public/data/base-stats.json em dia com battle-data.json', () => {
  const file = JSON.parse(readFileSync(new URL('../../public/data/base-stats.json', import.meta.url), 'utf8'));
  expect(file).toEqual(battleData.stats);
});
