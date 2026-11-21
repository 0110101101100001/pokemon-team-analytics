/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Os mesmos valores dos tokens de index.css (:root), para as classes utilitárias.
        page: '#F7F3EE',
        paper: { DEFAULT: '#F2EAD9', 2: '#E6D9BE' },
        ink: { DEFAULT: '#1C1A17', soft: '#4A463E' },
        umber: '#78614E',
        sepia: '#5C4033',
        brown: '#785132',
        olive: { DEFAULT: '#829B72', deep: '#5B7856', ink: '#3D5438' },
        vermilion: { DEFAULT: '#B8402A', deep: '#8A3B27' },
        ochre: { DEFAULT: '#B98428', deep: '#6B4A10' },
        smeargle: {
          bg: '#F2EAD9',            // creme quente / papel pergaminho
          surface: '#F5F0E6',       // creme ligeiramente mais escuro
          card: '#F2EAD9',          // creme nos cards (não branco puro)
          border: '#5C4033',        // marrom sépia / terra
          borderDim: '#D9CEC2',     // borda mais suave
          text: '#1C1A17',          // castanho escuro / carvão
          textDim: '#785132',       // marrom clássico do Smeargle
          accent: '#5C4033',        // marrom escuro siena
          accentBright: '#829b72',  // verde oliva/sage suave (ação, tags)
          glow: 'rgba(130, 155, 114, 0.15)',
          olive: '#829b72',         // verde oliva/sage
          cream: '#F2EAD9',
          ink: {
            brown: '#785132',       // marrom clássico
            darkBrown: '#5C4033',
            green: '#829b72',       // verde oliva/sage
            darkGreen: '#6E8B6E',
          },
        },
        // Tubos de tinta do ateliê: realces de foco, selos e estados ativos.
        paint: {
          olive: '#829b72',
          pistachio: '#A4C294',
          cobalt: '#4F6D8A',
          magenta: '#9E3D64',
          ochre: '#B98428',
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
        'card': '3px 3px 0 rgba(28, 26, 23, 0.14)',
        'card-hover': '4px 5px 0 rgba(28, 26, 23, 0.2)',
        'panel': '5px 5px 0 #4A463E',
        'hard': '3px 3px 0 #1C1A17',
        'hard-hover': '2px 2px 0 #1C1A17',
        'ink': '0 0 0 1px #1C1A17, 3px 3px 0 #1C1A17',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'bubble-pop': 'bubblePop 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'loader-sweep': 'loaderSweep 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'mascot-bob': 'mascotBob 3.2s ease-in-out infinite',
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
          '0%, 35%': { boxShadow: '0 0 0 3px rgba(185, 132, 40, 0.55)', backgroundColor: 'rgba(185, 132, 40, 0.22)' },
          '100%': { boxShadow: '0 0 0 3px rgba(185, 132, 40, 0)' },
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
        // O mascote balança de leve no lugar, como quem espera com o pincel na mão.
        mascotBob: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-3px) rotate(-2deg)' },
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
