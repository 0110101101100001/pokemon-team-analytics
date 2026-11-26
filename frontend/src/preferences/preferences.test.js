import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES, createPreferencesStore, normalizeDisplayName } from './preferences';

function fakeRoot() {
  const classes = new Set();
  return { classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) }, style: { fontSize: '' }, classes };
}

function setup({ rows = {}, saveError = null } = {}) {
  const root = fakeRoot();
  const api = {
    fetch: vi.fn(async (userId) => rows[userId] ?? null),
    save: vi.fn(async (userId, patch) => {
      if (saveError) throw saveError;
      rows[userId] = { ...rows[userId], ...patch };
    }),
  };
  const onSaveError = vi.fn();
  return { store: createPreferencesStore({ api, root, onSaveError }), api, root, rows, onSaveError };
}

describe('preferências da conta', () => {
  it('visitante fica nos padrões, sem consultar o banco', async () => {
    const { store, api } = setup();
    await store.restore(null);
    expect(store.getState()).toEqual({ userId: null, status: 'signed-out', values: DEFAULT_PREFERENCES });
    expect(api.fetch).not.toHaveBeenCalled();
  });

  it('carrega a linha da conta; colunas nulas viram o padrão', async () => {
    const { store } = setup({ rows: { u1: { default_level: 50, display_name: null, font_scale: 'large' } } });
    await store.restore('u1');
    expect(store.getState().status).toBe('ready');
    expect(store.getState().values).toMatchObject({ default_level: 50, display_name: null, font_scale: 'large', default_format: 'ou' });
  });

  it('aplica animações reduzidas e o tamanho da fonte no <html>', async () => {
    const { store, root } = setup({ rows: { u1: { reduce_motion: true, font_scale: 'larger' } } });
    await store.restore('u1');
    expect(root.classes.has('reduce-motion')).toBe(true);
    expect(root.style.fontSize).toBe('125%');
    await store.save({ reduce_motion: false, font_scale: 'normal' });
    expect(root.classes.has('reduce-motion')).toBe(false);
    expect(root.style.fontSize).toBe('');
  });

  it('salvar vale na hora e grava só as colunas mudadas', async () => {
    const { store, api } = setup();
    await store.restore('u1');
    const saving = store.save({ home_section: 'calculadora' });
    expect(store.getState().values.home_section).toBe('calculadora');
    expect(await saving).toBe(true);
    expect(api.save).toHaveBeenCalledWith('u1', { home_section: 'calculadora' });
  });

  it('se a gravação falha, volta ao último valor confirmado e avisa', async () => {
    const { store, onSaveError } = setup({ rows: { u1: { default_level: 50 } }, saveError: new Error('rede') });
    await store.restore('u1');
    expect(await store.save({ default_level: 100 })).toBe(false);
    expect(store.getState().values.default_level).toBe(50);
    expect(onSaveError).toHaveBeenCalled();
  });

  it('visitante não grava nada', async () => {
    const { store, api } = setup();
    await store.restore(null);
    expect(await store.save({ default_level: 50 })).toBe(false);
    expect(api.save).not.toHaveBeenCalled();
  });

  it('a resposta atrasada de uma conta anterior é ignorada', async () => {
    let release;
    const { store, api } = setup();
    api.fetch.mockImplementationOnce(() => new Promise((resolve) => {
      release = () => resolve({ default_level: 50 });
    }));
    const first = store.restore('u1');
    await store.restore(null);
    release();
    await first;
    expect(store.getState()).toMatchObject({ userId: null, status: 'signed-out' });
  });
});

describe('normalizeDisplayName', () => {
  it('apara, junta espaços, corta em 40 e transforma vazio em null', () => {
    expect(normalizeDisplayName('  Mestre   Kaique ')).toBe('Mestre Kaique');
    expect(normalizeDisplayName('   ')).toBeNull();
    expect(normalizeDisplayName('x'.repeat(50))).toHaveLength(40);
  });
});
