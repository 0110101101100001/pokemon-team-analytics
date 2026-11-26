import { describe, expect, it } from 'vitest';
import { REMEMBER_KEY, createAuthStorage, isRecoveryHash } from './authStorage';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
}

const KEY = 'sb-projeto-auth-token';

function setup() {
  const local = memoryStorage();
  const session = memoryStorage();
  return { local, session, storage: createAuthStorage({ local, session }) };
}

describe('Lembre-se de mim', () => {
  it('por padrão lembra: a sessão vai para o localStorage', () => {
    const { local, session, storage } = setup();
    expect(storage.getRemember()).toBe(true);
    storage.setItem(KEY, 'token');
    expect(local.getItem(KEY)).toBe('token');
    expect(session.getItem(KEY)).toBeNull();
  });

  it('desmarcado, a sessão vai para o sessionStorage e a escolha fica guardada', () => {
    const { local, session, storage } = setup();
    storage.setRemember(false);
    storage.setItem(KEY, 'token');
    expect(session.getItem(KEY)).toBe('token');
    expect(local.getItem(KEY)).toBeNull();
    expect(local.getItem(REMEMBER_KEY)).toBe('0');
    expect(storage.getItem(KEY)).toBe('token');
  });

  it('trocar de escolha não deixa uma sessão velha no outro armazenamento', () => {
    const { local, session, storage } = setup();
    storage.setItem(KEY, 'antiga');
    storage.setRemember(false);
    storage.setItem(KEY, 'nova');
    expect(local.getItem(KEY)).toBeNull();
    expect(session.getItem(KEY)).toBe('nova');
  });

  it('sair apaga dos dois', () => {
    const { local, session, storage } = setup();
    local.setItem(KEY, 'a');
    session.setItem(KEY, 'b');
    storage.removeItem(KEY);
    expect(local.getItem(KEY)).toBeNull();
    expect(session.getItem(KEY)).toBeNull();
  });

  it('armazenamento bloqueado não derruba o login', () => {
    const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); }, removeItem: () => {} };
    const storage = createAuthStorage({ local: broken, session: broken });
    expect(() => storage.setItem(KEY, 'token')).not.toThrow();
    expect(storage.getItem(KEY)).toBeNull();
    expect(storage.getRemember()).toBe(true);
  });
});

describe('isRecoveryHash', () => {
  it('reconhece a volta do link de "Esqueci minha senha"', () => {
    expect(isRecoveryHash('#access_token=abc&expires_in=3600&type=recovery')).toBe(true);
    expect(isRecoveryHash('#access_token=abc&type=signup')).toBe(false);
    expect(isRecoveryHash('#/pokedex?pokemon=pikachu')).toBe(false);
    expect(isRecoveryHash('')).toBe(false);
  });
});
