// Cor de tema com suporte ao modificador de opacidade (bg-ink/60): mistura o token com transparente.
const token = (name) => `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /*
          Todas as cores do site vêm dos tokens de tema (src/theme/themes.css). Os nomes antigos continuam valendo
          e apontam para o papel que tinham: page = fundo, paper = superfície, umber = rótulos, vermilion = seleção.
          O `/60` das classes funciona pelo color-mix com transparente.
        */
        page: token('bg'),
        paper: { DEFAULT: token('surface'), 2: token('surface-2') },
        ink: { DEFAULT: token('ink'), soft: token('ink-soft') },
        umber: token('muted'),
        sepia: token('ink-soft'),
        brown: token('muted'),
        olive: { DEFAULT: token('accent'), deep: token('accent-fill'), ink: token('accent-text') },
        vermilion: { DEFAULT: token('accent-text'), deep: token('danger') },
        ochre: { DEFAULT: token('secondary-icon'), deep: token('secondary-text') },
        // Papéis novos, para o código novo.
        bg: token('bg'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2') },
        line: { DEFAULT: token('border'), strong: token('border-strong') },
        muted: token('muted'),
        accent: { DEFAULT: token('accent'), fill: token('accent-fill'), text: token('accent-text'), on: token('on-accent') },
        secondary: { DEFAULT: token('secondary'), icon: token('secondary-icon'), text: token('secondary-text') },
        danger: token('danger'),
        smogon: token('smogon'),
        scrim: token('scrim'),
        header: { DEFAULT: token('header'), ink: token('header-ink'), solid: token('header-solid'), underline: token('header-underline') },
        // Texto sobre cores fixas (tipos, fraquezas), que não mudam com o tema.
        fixed: { light: token('fixed-light'), dark: token('fixed-dark') },
        smeargle: {
          bg: token('bg'),
          surface: token('surface'),
          card: token('surface'),
          border: token('ink-soft'),
          borderDim: token('border'),
          text: token('ink'),
          textDim: token('muted'),
          accent: token('ink-soft'),
          accentBright: token('accent'),
          glow: 'color-mix(in srgb, var(--accent) 15%, transparent)',
          olive: token('accent'),
          cream: token('surface'),
          ink: {
            brown: token('muted'),
            darkBrown: token('ink-soft'),
            green: token('accent'),
            darkGreen: token('accent-text'),
          },
        },
        // Tubos de tinta do ateliê: realces de foco, selos e estados ativos.
        paint: {
          olive: token('accent'),
          pistachio: token('header-underline'),
          cobalt: token('focus'),
          magenta: token('magenta'),
          ochre: token('secondary-icon'),
        },
        pokemon: {
          normal: '#A8A878',
          fire: '#F08030',
          water: '#6890F0',
          electric: '#F8D030',
          grass: '#78C850',
          ice: '#98D8D8',
          fighting: '#C03028',
          poison: '#A040A0',
          ground: '#E0C068',
          flying: '#A890F0',
          psychic: '#F85888',
          bug: '#A8B820',
          rock: '#B8A038',
          ghost: '#705898',
          dragon: '#7038F8',
          dark: '#705848',
          steel: '#B8B8D0',
          fairy: '#EE99AC',
        },
      },
      fontFamily: {
        // Texto corrido e rótulos na serifa de leitura; Playfair (serif/display) só em títulos; mono só em números.
        sans: ['"Newsreader"', 'Georgia', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // Anotações a nanquim: Newsreader itálico (o estilo e o ajuste de altura ficam em index.css).
        hand: ['"Newsreader"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        // Serifa de leitura do texto corrido, rótulos e controles; mono fica só para números.
        reading: ['"Newsreader"', 'Georgia', 'serif'],
      },
      borderRadius: {
        'xl': '1.25rem',
        'pill': '9999px',
        'panel': '4px',
        // Cantos dos cards impressos: quase retos.
        'sketch': '4px',
      },
      boxShadow: {
        // Sombra dura do papel impresso, na cor de sombra do tema (--shadow-hard).
        'card': '3px 3px 0 color-mix(in srgb, var(--shadow-base) 14%, transparent)',
        'card-hover': '4px 5px 0 color-mix(in srgb, var(--shadow-base) 20%, transparent)',
        'panel': '5px 5px 0 var(--shadow-hard)',
        'hard': '3px 3px 0 var(--shadow-hard)',
        'hard-hover': '2px 2px 0 var(--shadow-hard)',
        'ink': '0 0 0 1px var(--ink), 3px 3px 0 var(--shadow-hard)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'bubble-pop': 'bubblePop 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'loader-sweep': 'loaderSweep 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'cry-wave': 'cryWave 0.8s ease-in-out infinite',
        'cry-ring': 'cryRing 1.2s ease-out infinite',
        // Sem fill-mode: terminada a entrada, a seção não fica com transform nem contexto de empilhamento
        // (os modais `fixed` dentro dela dependem disso).
        'section-in': 'sectionIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        // O campo que o turno mudou: uma aguada ocre que aparece e seca.
        'ink-flash': 'inkFlash 1.1s ease-out',
      },
      keyframes: {
        inkFlash: {
          '0%, 35%': { boxShadow: '0 0 0 3px color-mix(in srgb, var(--secondary-icon) 55%, transparent)', backgroundColor: 'color-mix(in srgb, var(--secondary-icon) 22%, transparent)' },
          '100%': { boxShadow: '0 0 0 3px transparent' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bubblePop: {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        sectionIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
        },
        // Barra do carregamento: um trecho curto percorre o trilho da esquerda para a direita.
        loaderSweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
        cryWave: {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        cryRing: {
          '0%': { opacity: '0.6', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(1.35)' },
        },
      },
    },
  },
  plugins: [],
};
