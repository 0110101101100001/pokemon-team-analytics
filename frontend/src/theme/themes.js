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

/*
  Logos do header por tema (arquivos em public/; o teste themes-logos.test.js confere existência, tamanho e alfa).
  - logo: a completa, do topo. 372 × 96 na tela, com a versão 2x. As dos outros temas saem de design/logos
    pelo scripts/build-logos.mjs, no mesmo recorte da do Smeargle.
  - reducedLogo: a do header recolhido (e do celular): emblema + "Smearglepedia", 300 × 64 na tela, arquivo 3x.
    Feitas para o fundo do header de cada tema: nunca sobre fundo claro ou var(--surface).
*/
export const LOGO_SIZE = { width: 372, height: 96 };
export const REDUCED_LOGO_SIZE = { width: 300, height: 64 };

export const THEME_LOGOS = Object.fromEntries(THEME_IDS.map((id) => [id, {
  logo: { src: `/logo-${id}.png`, src2x: `/logo-${id}@2x.png`, ...LOGO_SIZE },
  reducedLogo: { src: `/logo-reduzida-${id}.png`, ...REDUCED_LOGO_SIZE },
}]));

export const logosFor = (theme) => THEME_LOGOS[theme] ?? THEME_LOGOS[DEFAULT_THEME];

/** Baixa antes as duas logos de um tema (hover ou foco no cartão da tela Aparência): a troca já sai pronta. */
export function prefetchThemeLogos(theme) {
  const { logo, reducedLogo } = logosFor(theme);
  const full = new Image();
  full.srcset = `${logo.src} 1x, ${logo.src2x} 2x`;
  full.src = logo.src;
  new Image().src = reducedLogo.src;
}
