import { describe, expect, it } from 'vitest';
import { arrangeProfiles } from './profileSearch';
import { authErrorMessage, passwordProblem } from './accountSecurity';
import { buildExport, exportFileName } from './dataExport';
import { timeAgo } from './timeAgo';
import { sideFromPokemon } from '../components/calc/calcState';

const species = [
  { name: 'bulbasaur', species: 'bulbasaur', generation: 1 },
  { name: 'pikachu', species: 'pikachu', generation: 1 },
  { name: 'chikorita', species: 'chikorita', generation: 2 },
  { name: 'sprigatito', species: 'sprigatito', generation: 9 },
];

describe('arrangeProfiles (Perfil)', () => {
  it('filtra por geração', () => {
    expect(arrangeProfiles(species, { generation: 1 }).map((entry) => entry.name)).toEqual(['bulbasaur', 'pikachu']);
  });

  it('põe os favoritos na frente, mantendo a ordem da Pokédex', () => {
    const favorites = new Set(['sprigatito', 'pikachu']);
    expect(arrangeProfiles(species, { favorites, favoritesFirst: true }).map((entry) => entry.name))
      .toEqual(['pikachu', 'sprigatito', 'bulbasaur', 'chikorita']);
  });

  it('sem a opção, ou sem favoritos, a ordem não muda', () => {
    expect(arrangeProfiles(species, { favorites: new Set(['pikachu']) })).toEqual(species);
    expect(arrangeProfiles(species, { favoritesFirst: true, favorites: new Set() })).toEqual(species);
  });
});

describe('troca de senha', () => {
  it('pede 8 caracteres e as duas iguais', () => {
    expect(passwordProblem('curta', 'curta')).toMatch(/8 caracteres/);
    expect(passwordProblem('senha-longa-1', 'senha-longa-2')).toMatch(/não são iguais/);
    expect(passwordProblem('senha-longa-1', 'senha-longa-1')).toBeNull();
  });

  it('traduz os erros conhecidos do Supabase e esconde os outros', () => {
    expect(authErrorMessage({ code: 'same_password' })).toMatch(/diferente/);
    expect(authErrorMessage({ code: 'qualquer', message: 'stack interno' })).not.toMatch(/stack/);
  });
});

describe('exportar meus dados', () => {
  it('nome com a data local e conteúdo com conta, data e tabelas', () => {
    const now = new Date(2026, 10, 26, 9, 5);
    expect(exportFileName(now)).toBe('smearglepedia-dados-2026-11-26.json');
    const file = buildExport({ email: 'a@b.c', userId: 'u1', data: { times: [], favoritos: [{ pokemon_name: 'pikachu' }] }, now });
    expect(file).toMatchObject({ site: 'Smearglepedia', versao: 1, conta: { id: 'u1', email: 'a@b.c' }, favoritos: [{ pokemon_name: 'pikachu' }] });
    expect(file.exportado_em).toBe(now.toISOString());
  });
});

describe('timeAgo', () => {
  it('escreve o tempo relativo em português', () => {
    const now = Date.parse('2026-11-26T12:00:00Z');
    expect(timeAgo('2026-11-26T11:55:00Z', now)).toBe('há 5 minutos');
    expect(timeAgo('2026-11-25T12:00:00Z', now)).toBe('ontem');
    expect(timeAgo('2026-11-05T12:00:00Z', now)).toBe('há 3 semanas');
  });
});

describe('nível padrão na calculadora', () => {
  it('um Pokémon escolhido à mão entra no nível da conta; um set pronto mantém o dele', () => {
    expect(sideFromPokemon({ name: 'pikachu' }, null, { level: 50 }).set.level).toBe(50);
    expect(sideFromPokemon({ name: 'pikachu' }).set.level).toBe(100);
    const set = { level: 77, moves: [] };
    expect(sideFromPokemon({ name: 'pikachu' }, set, { level: 50 }).set.level).toBe(77);
  });
});
