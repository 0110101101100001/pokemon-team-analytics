/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        smeargle: {
          bg: '#FBF8F3',            // creme quente / papel pergaminho
          surface: '#F5F0E6',       // creme ligeiramente mais escuro
          card: '#FBF8F3',          // creme nos cards (não branco puro)
          border: '#5C4033',        // marrom sépia / terra
          borderDim: '#D9CEC2',     // borda mais suave
          text: '#2A2421',          // castanho escuro / carvão
          textDim: '#785132',       // marrom clássico do Smeargle
          accent: '#5C4033',        // marrom escuro siena
          accentBright: '#829b72',  // verde oliva/sage suave (ação, tags)
          glow: 'rgba(130, 155, 114, 0.15)',
          olive: '#829b72',         // verde oliva/sage
          cream: '#FBF8F3',
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
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // Anotações a nanquim: Playfair itálico (o estilo e o ajuste de altura ficam em index.css).
        hand: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'xl': '1.25rem',
        'pill': '9999px',
        'panel': '1.5rem',
        // Cantos de um traço de pincel: levemente desiguais.
        'sketch': '1.1rem 1.4rem 1.2rem 1rem / 1rem 1.2rem 1.1rem 1.3rem',
      },
      boxShadow: {
        'card': '3px 3px 0 rgba(42, 36, 33, 0.14)',
        'card-hover': '4px 5px 0 rgba(42, 36, 33, 0.2)',
        'panel': '6px 7px 0 rgba(42, 36, 33, 0.18), 0 24px 60px -24px rgba(42, 36, 33, 0.35)',
        'hard': '3px 3px 0 #2A2421',
        'hard-hover': '2px 2px 0 #2A2421',
        'ink': '0 0 0 1px #2A2421, 3px 3px 0 #2A2421',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'bubble-pop': 'bubblePop 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'ink-drop': 'inkDrop 1.4s cubic-bezier(0.55, 0, 0.45, 1) infinite',
        'ink-ripple': 'inkRipple 1.4s ease-out infinite',
        'cry-wave': 'cryWave 0.8s ease-in-out infinite',
        'cry-ring': 'cryRing 1.2s ease-out infinite',
        // Sem fill-mode: terminada a entrada, a seção não fica com transform nem contexto de empilhamento
        // (os modais `fixed` dentro dela dependem disso).
        'section-in': 'sectionIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
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
        // Gota de tinta caindo e a onda que ela abre ao tocar o papel.
        inkDrop: {
          '0%': { transform: 'translateY(-14px) scale(0.7, 1.25)', opacity: '0' },
          '15%': { opacity: '1' },
          '55%': { transform: 'translateY(6px) scale(1, 1)', opacity: '1' },
          '62%, 100%': { transform: 'translateY(8px) scale(1.5, 0.4)', opacity: '0' },
        },
        inkRipple: {
          '0%, 55%': { transform: 'scale(0.2)', opacity: '0' },
          '62%': { opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
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
