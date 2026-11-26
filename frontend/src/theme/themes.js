/*
  Os dezesseis temas, num objeto só: id, nome, grupo (claro ou escuro), descrição e os arquivos de logo em public/.
  As cores moram em themes.css (a fonte única); a lista de ids se repete no script do <head> de index.html,
  que roda antes de qualquer módulo. O nome do arquivo de logo é a fonte da verdade: o Darkrai usa os de
  "darkraishiny". As completas de 372 × 96 saem de design/logos pelo scripts/build-logos.mjs, que também gera as WebP
  (o formato usado) a partir dos PNG.
*/
export const DEFAULT_THEME = 'smeargle';

// Tamanhos exibidos das logos (os mesmos em todos os temas); a reduzida é um arquivo 3x.
export const LOGO_SIZE = { width: 372, height: 96 };
export const REDUCED_LOGO_SIZE = { width: 300, height: 64 };

const logos = (file) => ({
  logo: { src: `/logo-${file}.webp`, src2x: `/logo-${file}@2x.webp`, ...LOGO_SIZE },
  reducedLogo: { src: `/logo-reduzida-${file}.webp`, ...REDUCED_LOGO_SIZE },
});

// `pokemon` é quem aparece na prévia do tema (Configurações → Aparência): número da Pokédex, tipos, se é shiny e o
// nome da espécie quando ele não é o id do tema (ninetales-shiny mostra "Ninetales").
const pokemon = (number, types, shiny = false, species = null) => ({ number, types, shiny, species });

export const THEMES = [
  {
    id: 'smeargle', name: 'Smeargle', group: 'light', pokemon: pokemon(235, ['normal']),
    description: 'O ateliê de sempre: papel creme, nanquim marrom e respingos de tinta verde.', ...logos('smeargle'),
  },
  {
    id: 'wailord', name: 'Wailord', group: 'light', pokemon: pokemon(321, ['water']),
    description: 'Mar aberto: azul profundo sobre um papel claro como espuma.', ...logos('wailord'),
  },
  {
    id: 'empoleon', name: 'Empoleon', group: 'light', pokemon: pokemon(395, ['water', 'steel']),
    description: 'Azul-marinho de imperador, com acabamento dourado.', ...logos('empoleon'),
  },
  {
    id: 'groudon', name: 'Groudon', group: 'dark', pokemon: pokemon(383, ['ground']),
    description: 'Rocha escura rachada por veios de lava acesa.', ...logos('groudon'),
  },
  {
    id: 'zoroark', name: 'Zoroark', group: 'dark', pokemon: pokemon(571, ['dark']),
    description: 'Noite cinzenta riscada de carmim, com um brilho turquesa de ilusão.', ...logos('zoroark'),
  },
  {
    id: 'chandelure', name: 'Chandelure', group: 'dark', pokemon: pokemon(609, ['ghost', 'fire']),
    description: 'Penumbra de vidro escuro, iluminada por chamas roxas.', ...logos('chandelure'),
  },
  {
    id: 'serperior', name: 'Serperior', group: 'light', pokemon: pokemon(497, ['grass']),
    description: 'Verde-folha elegante, com o dourado de quem nasceu para reinar.', ...logos('serperior'),
  },
  {
    id: 'pikachu', name: 'Pikachu', group: 'light', pokemon: pokemon(25, ['electric']),
    description: 'Amarelo elétrico e traço preto firme: energia do começo ao fim.', ...logos('pikachu'),
  },
  {
    id: 'sylveon', name: 'Sylveon', group: 'light', pokemon: pokemon(700, ['fairy']),
    description: 'Rosa suave e fitas azuis, leve como um laço ao vento.', ...logos('sylveon'),
  },
  {
    id: 'haxorus', name: 'Haxorus', group: 'dark', pokemon: pokemon(612, ['dragon']),
    description: 'Armadura negra e ouro-oliva, com o corte vermelho das presas.', ...logos('haxorus'),
  },
  {
    id: 'heracross', name: 'Heracross', group: 'dark', pokemon: pokemon(214, ['bug', 'fighting']),
    description: 'Carapaça azul da meia-noite com faíscas amarelas.', ...logos('heracross'),
  },
  {
    id: 'darkrai', name: 'Darkrai Shiny', group: 'dark', pokemon: pokemon(491, ['dark'], true),
    description: 'Roxo de pesadelo, cortado por um olhar ciano.', ...logos('darkraishiny'),
  },
  {
    id: 'aggron', name: 'Aggron', group: 'dark', pokemon: pokemon(306, ['steel', 'rock']),
    description: 'Aço escuro de armadura, com reflexos azuis de metal polido.', ...logos('aggron'),
  },
  {
    // O id tem hífen; os arquivos de logo, não (logo-ninetalesshiny.png).
    id: 'ninetales-shiny', name: 'Ninetales Shiny', group: 'dark', pokemon: pokemon(38, ['fire'], true, 'ninetales'),
    description: 'Noite fria de pelagem prateada, com chamas azul-gelo.', ...logos('ninetalesshiny'),
  },
  {
    id: 'staraptor', name: 'Staraptor', group: 'light', pokemon: pokemon(398, ['normal', 'flying']),
    description: 'Céu nublado e penas cinzentas, com o laranja do bico em destaque.', ...logos('staraptor'),
  },
  {
    id: 'maushold', name: 'Maushold', group: 'light', pokemon: pokemon(925, ['normal']),
    description: 'Papel bem claro e um rosa de bochecha, aconchegante como uma família.', ...logos('maushold'),
  },
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
