/*
  Preferências de uso da conta (user_settings), num estado só para a página, como o tema: qualquer tela lê com
  usePreferences() sem receber props. Visitante usa sempre os padrões. Uma escolha vale na hora e é gravada; se a
  gravação falhar, volta ao último valor confirmado.
*/

export const FORMATS = [
  { value: 'ou', label: 'OU (Singles)' },
  { value: 'vgc', label: 'VGC' },
  { value: 'doubles', label: 'Doubles OU' },
];
// Aba de uso da Smogon na ficha: o banco não tem uso de VGC, e o Doubles OU é o mais próximo.
export const FORMAT_STATS_TIER = { ou: 'gen9ou', vgc: 'gen9doublesou', doubles: 'gen9doublesou' };
// Formatos de build (gen9.json) que vão para o começo da lista na ficha.
export const FORMAT_BUILD_TIERS = { ou: ['ou'], vgc: ['vgc2025', 'vgc2024', 'vgc2023'], doubles: ['doublesou'] };

export const LEVELS = [50, 100];
// A ordem de tentativa de cada estilo mora em services/sprites.js (heroSpriteSources).
export const SPRITE_STYLES = [
  { value: '2d', label: '2D', hint: 'O sprite pixelado dos jogos, parado.' },
  { value: '2d-animated', label: '2D animado', hint: 'O animado de Black/White. Depois do nº 649, que ele não cobre, aparece o 2D parado.' },
  { value: '3d-animated', label: '3D animado', hint: 'O modelo 3D animado do Pokémon Showdown.' },
  { value: 'static', label: 'Estática', hint: 'A arte oficial, em alta resolução.' },
];
export const FONT_SCALES = [
  { value: 'normal', label: 'Normal', percent: 100 },
  { value: 'large', label: 'Grande', percent: 112.5 },
  { value: 'larger', label: 'Maior', percent: 125 },
];
export const DISPLAY_NAME_MAX = 40;

export const DEFAULT_PREFERENCES = Object.freeze({
  display_name: null,
  default_format: 'ou',
  default_league_game: null,
  default_level: 100,
  sprite_style: '3d-animated',
  shiny_sprites: false,
  home_section: 'pokedex',
  reduce_motion: false,
  font_scale: 'normal',
});

const withDefaults = (row) => {
  const merged = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(DEFAULT_PREFERENCES)) if (row?.[key] != null) merged[key] = row[key];
  return merged;
};

/** Nome de exibição limpo: espaços nas pontas fora, vazio vira null (volta ao nome do e-mail). */
export function normalizeDisplayName(value) {
  const trimmed = String(value ?? '').trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, DISPLAY_NAME_MAX) : null;
}

/**
 * `api` = { fetch(userId) → linha ou null, save(userId, patch) }; `root` é o <html>, onde moram a classe de
 * animações reduzidas e a escala da fonte.
 */
export function createPreferencesStore({ api, root, onSaveError }) {
  let state = { userId: null, status: 'signed-out', values: DEFAULT_PREFERENCES };
  let confirmed = DEFAULT_PREFERENCES;
  let account = 0;
  const pending = new Map(); // chave → id da última escolha, para só a última que falhar reverter
  let choice = 0;
  const listeners = new Set();

  function applyRoot(values) {
    if (!root) return;
    root.classList?.toggle('reduce-motion', values.reduce_motion);
    const scale = FONT_SCALES.find((option) => option.value === values.font_scale) ?? FONT_SCALES[0];
    if (root.style) root.style.fontSize = scale.percent === 100 ? '' : `${scale.percent}%`;
  }

  function set(next) {
    state = next;
    applyRoot(state.values);
    listeners.forEach((listener) => listener());
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,

    /** Troca de conta (ou saída): visitante volta aos padrões; conta carrega a própria linha. */
    async restore(userId) {
      if (userId === state.userId && state.status !== 'error') return;
      const current = ++account;
      confirmed = DEFAULT_PREFERENCES;
      pending.clear();
      if (!userId) {
        set({ userId: null, status: 'signed-out', values: DEFAULT_PREFERENCES });
        return;
      }
      set({ userId, status: 'loading', values: DEFAULT_PREFERENCES });
      try {
        const row = await api.fetch(userId);
        if (current !== account) return;
        confirmed = withDefaults(row);
        set({ userId, status: 'ready', values: confirmed });
      } catch (error) {
        if (current !== account) return;
        console.warn('Preferências indisponíveis:', error);
        set({ userId, status: 'error', values: DEFAULT_PREFERENCES });
      }
    },

    /** Muda uma ou mais preferências. Resolve true se gravou, false se falhou (e já reverteu). */
    async save(patch) {
      const { userId } = state;
      if (!userId) return false;
      const current = account;
      const id = ++choice;
      Object.keys(patch).forEach((key) => pending.set(key, id));
      set({ ...state, values: { ...state.values, ...patch } });
      try {
        await api.save(userId, patch);
        if (current !== account) return false;
        confirmed = { ...confirmed, ...patch };
        return true;
      } catch (error) {
        if (current !== account) return false;
        // Reverte só as chaves cuja última escolha foi esta.
        const reverted = Object.fromEntries(Object.keys(patch).filter((key) => pending.get(key) === id).map((key) => [key, confirmed[key]]));
        set({ ...state, values: { ...state.values, ...reverted } });
        onSaveError?.(error);
        return false;
      }
    },
  };
}
