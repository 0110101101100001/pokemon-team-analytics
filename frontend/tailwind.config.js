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
        display: ['"Playfair Display"', 'serif'],
        hand: ['"Caveat"', 'cursive'],
        mono: ['"VT323"', 'monospace'],
        sketch: ['"VT323"', 'monospace'],
      },
      borderRadius: {
        'xl': '1.25rem',
        'pill': '9999px',
        'panel': '1.5rem',
        'sketch': '1rem 2rem 1.5rem 1rem', // cantos assimétricos estilo desenho à mão
      },
      boxShadow: {
        'card': '0 4px 20px -4px rgba(62, 46, 36, 0.08)',
        'card-hover': '0 12px 32px -8px rgba(62, 46, 36, 0.12), 0 0 0 1px rgba(120, 81, 50, 0.15)',
        'mascote': '0 8px 32px rgba(62, 46, 36, 0.12)',
        'panel': '0 20px 60px -12px rgba(62, 46, 36, 0.10), 0 0 0 1px rgba(120, 81, 50, 0.10)',
        'hard': '4px 4px 0px 0px #785132', // hard shadow retrô
        'hard-hover': '2px 2px 0px 0px #785132', // sombra sobe com o card
        'ink': '0 0 0 1px #785132, 2px 2px 0px 0px #5C4033', // traço de tinta
      },
      animation: {
        'float': 'float 7s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'bubble-pop': 'bubblePop 0.5s ease-out forwards',
        'cry-wave': 'cryWave 0.8s ease-in-out infinite',
        'cry-ring': 'cryRing 1.2s ease-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(2deg)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.03)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(25px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bubblePop: {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
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
