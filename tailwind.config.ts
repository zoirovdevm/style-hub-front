import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0a0c',
          900: '#111114',
          800: '#1a1a1f',
          700: '#26262d',
        },
        cream: '#f7f5f2',
        // Was a warm gold (#d8b969/#c9a24f/#a9843a) — the site's one accent
        // color, used everywhere from CTA buttons and badges to star
        // ratings and the hero glow. Recolored to neutral gray at the same
        // relative lightness as each original shade (400 lightest, 600
        // darkest), so every existing `bg-gold-500`/`text-gold-400`/etc.
        // across the whole codebase renders gray now with NO other files
        // touched — the class names ("gold") stay the same, only the color
        // they point to changed, for a black-and-white/monochrome look.
        gold: {
          400: '#d4d4d4',
          500: '#a8a8a8',
          600: '#787878',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        marquee: 'marquee 26s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
      },
      boxShadow: {
        soft: '0 20px 60px -20px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
