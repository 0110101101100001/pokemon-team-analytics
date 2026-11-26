/*
  Os doze temas, num objeto só: id, nome, grupo (claro ou escuro), descrição e os arquivos de logo em public/.
  As cores moram em themes.css (a fonte única); a lista de ids se repete no script do <head> de index.html,
  que roda antes de qualquer módulo. O nome do arquivo de logo é a fonte da verdade: o Darkrai usa os de
  "darkraishiny". As completas de 372 × 96 saem de design/logos pelo scripts/build-logos.mjs.
*/
export const DEFAULT_THEME = 'smeargle';

// Tamanhos exibidos das logos (os mesmos em todos os temas); a reduzida é um arquivo 3x.
export const LOGO_SIZE = { width: 372, height: 96 };
export const REDUCED_LOGO_SIZE = { width: 300, height: 64 };

const logos = (file) => ({
  logo: { src: `/logo-${file}.png`, src2x: `/logo-${file}@2x.png`, ...LOGO_SIZE },
  reducedLogo: { src: `/logo-reduzida-${file}.png`, ...REDUCED_LOGO_SIZE },
});

export const THEMES = [
  { id: 'smeargle', name: 'Smeargle', group: 'light', description: 'Creme, boina marrom e ponta de tinta verde', ...logos('smeargle') },
  { id: 'wailord', name: 'Wailord', group: 'light', description: 'Azul-oceano com barriga creme', ...logos('wailord') },
  { id: 'empoleon', name: 'Empoleon', group: 'light', description: 'Azul-marinho, branco e tridente dourado', ...logos('empoleon') },
  { id: 'groudon', name: 'Groudon', group: 'dark', description: 'Vermelho-magma, linhas pretas e brilho de lava', ...logos('groudon') },
  { id: 'zoroark', name: 'Zoroark', group: 'dark', description: 'Pelagem grafite, juba carmim e olho turquesa', ...logos('zoroark') },
  { id: 'chandelure', name: 'Chandelure', group: 'dark', description: 'Vidro escuro, chama roxa e dourado', ...logos('chandelure') },
  { id: 'serperior', name: 'Serperior', group: 'light', description: 'Verde-folha, creme e gola dourada', ...logos('serperior') },
  { id: 'pikachu', name: 'Pikachu', group: 'light', description: 'Amarelo elétrico, preto e bochecha vermelha', ...logos('pikachu') },
  { id: 'sylveon', name: 'Sylveon', group: 'light', description: 'Branco, rosa e laço azul', ...logos('sylveon') },
  { id: 'haxorus', name: 'Haxorus', group: 'dark', description: 'Armadura preta, corpo dourado-oliva e presas vermelhas', ...logos('haxorus') },
  { id: 'heracross', name: 'Heracross', group: 'dark', description: 'Azul-besouro escuro e olhos amarelos', ...logos('heracross') },
  { id: 'darkrai', name: 'Darkrai Shiny', group: 'dark', description: 'Roxo profundo, olho ciano e colar vermelho', ...logos('darkraishiny') },
];

export const THEME_IDS = THEMES.map((theme) => theme.id);

export const THEME_GROUPS = [
  { id: 'light', label: 'Modo claro' },
  { id: 'dark', label: 'Modo escuro' },
];

export const isThemeId = (value) => THEME_IDS.includes(value);

export const THEME_LOGOS = Object.fromEntries(THEMES.map(({ id, logo, reducedLogo }) => [id, { logo, reducedLogo }]));

export const logosFor = (theme) => THEME_LOGOS[theme] ?? THEME_LOGOS[DEFAULT_THEME];

/** Baixa antes as duas logos de um tema (hover ou foco no cartão da tela Aparência): a troca já sai pronta. */
export function prefetchThemeLogos(theme) {
  const { logo, reducedLogo } = logosFor(theme);
  const full = new Image();
  full.srcset = `${logo.src} 1x, ${logo.src2x} 2x`;
  full.src = logo.src;
  new Image().src = reducedLogo.src;
}
