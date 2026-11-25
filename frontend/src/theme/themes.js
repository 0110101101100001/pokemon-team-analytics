/*
  Os seis temas: id, nome e descrição para a tela Aparência. As cores moram em themes.css (a fonte única);
  a lista de ids se repete no script do <head> de index.html, que roda antes de qualquer módulo.
*/
export const DEFAULT_THEME = 'smeargle';

export const THEMES = [
  { id: 'smeargle', name: 'Smeargle', group: 'light', description: 'Creme, boina marrom e ponta de tinta verde' },
  { id: 'wailord', name: 'Wailord', group: 'light', description: 'Azul-oceano com barriga creme' },
  { id: 'empoleon', name: 'Empoleon', group: 'light', description: 'Azul-marinho, branco e tridente dourado' },
  { id: 'groudon', name: 'Groudon', group: 'dark', description: 'Vermelho-magma, linhas pretas e brilho de lava' },
  { id: 'zoroark', name: 'Zoroark', group: 'dark', description: 'Pelagem grafite, juba carmim e olho turquesa' },
  { id: 'chandelure', name: 'Chandelure', group: 'dark', description: 'Vidro escuro, chama roxa e dourado' },
];

export const THEME_IDS = THEMES.map((theme) => theme.id);

export const THEME_GROUPS = [
  { id: 'light', label: 'Modo claro' },
  { id: 'dark', label: 'Modo escuro' },
];

export const isThemeId = (value) => THEME_IDS.includes(value);
