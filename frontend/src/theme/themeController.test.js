import { describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, createThemeController, readStoredTheme } from './themeController';

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
}

function fakeRoot() {
  const classes = new Set();
  return { dataset: {}, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) }, classes };
}

function setup({ stored, saved = {}, saveError = null } = {}) {
  const storage = fakeStorage(stored ? { [THEME_STORAGE_KEY]: stored } : {});
  const root = fakeRoot();
  const api = {
    fetch: vi.fn(async (userId) => saved[userId] ?? null),
    save: vi.fn(async (userId, theme) => {
      if (saveError) throw saveError;
      saved[userId] = theme;
    }),
  };
  const onSaveError = vi.fn();
  const controller = createThemeController({ storage, root, api, onSaveError, schedule: () => 0 });
  return { storage, root, api, onSaveError, controller };
}

describe('readStoredTheme', () => {
  it('id inválido no localStorage cai para smeargle', () => {
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: 'pikachu' }))).toBe('smeargle');
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: '' }))).toBe('smeargle');
    expect(readStoredTheme(fakeStorage())).toBe('smeargle');
  });

  it('armazenamento que lança erro também cai para smeargle', () => {
    const broken = { getItem: () => { throw new Error('bloqueado'); } };
    expect(readStoredTheme(broken)).toBe('smeargle');
  });

  it('id válido é mantido', () => {
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: 'zoroark' }))).toBe('zoroark');
  });
});

describe('createThemeController', () => {
  it('conta com tema salvo: aplica e espelha no localStorage', async () => {
    const { controller, root, storage } = setup({ saved: { a: 'groudon' } });
    await controller.restore('a');
    expect(root.dataset.theme).toBe('groudon');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('groudon');
  });

  it('conta sem linha em user_settings: fica no smeargle e não grava nada', async () => {
    const { controller, root, storage, api } = setup({ stored: 'wailord' });
    await controller.restore('novo');
    expect(root.dataset.theme).toBe('smeargle');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(api.save).not.toHaveBeenCalled();
  });

  it('escolher aplica na hora, guarda e faz o upsert', async () => {
    const { controller, root, storage, api } = setup();
    await controller.restore('a');
    const pending = controller.choose('empoleon');
    expect(root.dataset.theme).toBe('empoleon');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('empoleon');
    await expect(pending).resolves.toBe(true);
    expect(api.save).toHaveBeenCalledWith('a', 'empoleon');
  });

  it('erro no upsert reverte ao tema anterior e avisa', async () => {
    const { controller, root, storage, onSaveError } = setup({ saved: { a: 'chandelure' }, saveError: new Error('rede') });
    await controller.restore('a');
    await expect(controller.choose('wailord')).resolves.toBe(false);
    expect(root.dataset.theme).toBe('chandelure');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('chandelure');
    expect(onSaveError).toHaveBeenCalledOnce();
  });

  it('erro no upsert de quem nunca salvou volta ao smeargle sem deixar chave', async () => {
    const { controller, root, storage } = setup({ saveError: new Error('rede') });
    await controller.restore('novo');
    await controller.choose('zoroark');
    expect(root.dataset.theme).toBe('smeargle');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('logout limpa a chave e volta ao smeargle', async () => {
    const { controller, root, storage } = setup({ saved: { a: 'groudon' } });
    await controller.restore('a');
    await controller.restore(null);
    expect(root.dataset.theme).toBe('smeargle');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('visitante não troca de tema', async () => {
    const { controller, root, api } = setup();
    await controller.restore(null);
    await expect(controller.choose('groudon')).resolves.toBe(false);
    expect(root.dataset.theme).toBe('smeargle');
    expect(api.save).not.toHaveBeenCalled();
  });

  it('outro usuário no mesmo navegador não herda o tema do anterior', async () => {
    const { controller, root } = setup({ saved: { a: 'groudon' } });
    await controller.restore('a');
    await controller.restore('b');
    expect(root.dataset.theme).toBe('smeargle');
  });

  it('a resposta atrasada de uma conta que já saiu é ignorada', async () => {
    const { controller, root, api } = setup({ saved: { a: 'groudon' } });
    let release;
    api.fetch.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve('groudon'); }));
    const slow = controller.restore('a');
    await controller.restore(null);
    release();
    await slow;
    expect(root.dataset.theme).toBe('smeargle');
  });

  it('id inválido na escolha é recusado', async () => {
    const { controller, api } = setup();
    await controller.restore('a');
    await expect(controller.choose('pikachu')).resolves.toBe(false);
    expect(api.save).not.toHaveBeenCalled();
  });

  it('a troca liga a transição de cor só durante a troca', async () => {
    const { controller, root } = setup();
    await controller.restore('a');
    await controller.choose('zoroark');
    expect(root.classes.has('theme-switching')).toBe(true);
  });
});
