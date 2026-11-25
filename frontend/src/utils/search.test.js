import { beforeAll, describe, expect, it } from 'vitest';
import { createSearch, createSearchIndex, loadFuzzySearch, normalizeSearchText, suggestName } from './search';
import { createFilter, createFiltersMatcher, filterPokedex } from './filters';

const entry = (name, number, types, generation) => ({ name, number, id: number, types, generation, eggGroups: [], region: null });

const LIST = [
  entry('charmander', 4, ['fire'], 1),
  entry('charizard', 6, ['fire', 'flying'], 1),
  entry('pikachu', 25, ['electric'], 1),
  entry('nidoran-f', 29, ['poison'], 1),
  entry('nidorina', 30, ['poison'], 1),
  entry('nidoran-m', 32, ['poison'], 1),
  entry('farfetchd', 83, ['normal', 'flying'], 1),
  entry('mr-mime', 122, ['psychic', 'fairy'], 1),
  entry('pichu', 172, ['electric'], 2),
  entry('ho-oh', 250, ['fire', 'flying'], 2),
  entry('pikipek', 731, ['normal', 'flying'], 7),
  entry('flabebe', 669, ['fairy'], 6),
  entry('farfetchd-galar', 83, ['fighting'], 8),
  entry('mr-mime-galar', 122, ['ice', 'psychic'], 8),
];
const index = createSearchIndex(LIST);
beforeAll(() => loadFuzzySearch());
const names = (term, filters = []) =>
  filterPokedex(LIST, { search: createSearch(index, term), matchesFilters: createFiltersMatcher(filters) }).map((p) => p.name);

describe('normalizeSearchText', () => {
  it('tira acentos, maiúsculas e separadores', () => {
    expect(normalizeSearchText('Mr. Mime')).toBe('mrmime');
    expect(normalizeSearchText("Farfetch'd")).toBe('farfetchd');
    expect(normalizeSearchText('Flabébé')).toBe('flabebe');
    expect(normalizeSearchText('Ho-Oh')).toBe('hooh');
    expect(normalizeSearchText('Nidoran♀')).toBe('nidoranf');
  });
});

describe('createSearch', () => {
  it('ignora acentos', () => {
    expect(names('flabébé')).toEqual(['flabebe']);
  });

  it('ignora espaços, hífens, apóstrofos e pontos', () => {
    expect(names('mr mime')).toEqual(['mr-mime', 'mr-mime-galar']);
    expect(names('Mr. Mime')).toEqual(['mr-mime', 'mr-mime-galar']);
    expect(names("farfetch'd")).toEqual(['farfetchd', 'farfetchd-galar']);
    expect(names('ho oh')).toEqual(['ho-oh']);
  });

  it('acha os dois Nidoran', () => {
    expect(names('nidoran')).toEqual(['nidoran-f', 'nidoran-m']);
  });

  it('tolera erros de digitação', () => {
    expect(names('charisard')).toContain('charizard');
    expect(names('pikatchu')[0]).toBe('pikachu');
  });

  it('ordena por igual > começa com > contém > fuzzy', () => {
    expect(names('pi')).toEqual(['pikachu', 'pichu', 'pikipek']);
    expect(names('mime')).toEqual(['mr-mime', 'mr-mime-galar']);
    expect(names('pikachu')[0]).toBe('pikachu');
    const charz = names('chariz');
    expect(charz[0]).toBe('charizard');
  });

  it('busca pelo número exato com ou sem zeros e #', () => {
    for (const term of ['25', '025', '#25', 'Nº 25']) expect(names(term)).toEqual(['pikachu']);
  });

  it('número parcial não traz outros números', () => {
    expect(names('2')).toEqual([]);
    expect(names('8')).toEqual([]);
    expect(names('83')).toEqual(['farfetchd', 'farfetchd-galar']);
  });

  it('sem termo, não filtra', () => {
    expect(createSearch(index, '   ')).toBeNull();
  });
});

describe('busca combinada com filtros', () => {
  it('respeita o filtro de tipo', () => {
    expect(names('pi', [createFilter('type', 'electric')])).toEqual(['pikachu', 'pichu']);
    expect(names('farfetchd', [createFilter('type', 'fighting')])).toEqual(['farfetchd-galar']);
  });

  it('respeita o filtro de geração', () => {
    expect(names('mr mime', [createFilter('generation', '8')])).toEqual(['mr-mime-galar']);
    expect(names('25', [createFilter('generation', '2')])).toEqual([]);
  });
});

describe('suggestName', () => {
  it('sugere o nome mais parecido entre os permitidos', () => {
    const all = new Set(LIST.map((p) => p.name));
    expect(suggestName(index, 'charizrdd', all)).toBe('charizard');
    expect(suggestName(index, 'xyzw', all)).toBeNull();
    expect(suggestName(index, 'zzqx', all)).toBeNull();
    expect(suggestName(index, '25', all)).toBeNull();
  });

  it('não sugere quem os filtros excluem', () => {
    expect(suggestName(index, 'pikatchu', new Set(['charizard']))).toBeNull();
  });
});
