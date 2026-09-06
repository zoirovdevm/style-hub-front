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
        // The site's one accent color — used everywhere from CTA buttons
        // and badges to star ratings and the hero glow. Went warm gold →
        // neutral gray (black-and-white pass) → now green, per request
        // (linear-gradient(135deg, #10b981 0%, #059669 100%)). 500/600 are
        // that gradient's exact two stops (emerald-500/600); 400 is a
        // lighter emerald for accents that need to pop on a dark
        // background (hero eyebrow text, icons). The class names ("gold")
        // stay the same on purpose — every existing `bg-gold-500` /
        // `text-gold-400` / etc. across the whole codebase just picks up
        // the new color with no other files touched.
        gold: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
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
        // Slower, multi-directional drift for the hero's glow blobs — the
        // plain `float` above only bounces straight up/down and is quick
        // (6s), which reads as a bounce rather than a "gently floating"
        // effect. This instead wanders in both x and y over a much longer
        // loop, so it feels ambient rather than something you'd consciously
        // notice moving. Each blob is given a different duration/delay
        // inline (see page.tsx) so they drift out of sync with each other.
        'float-slow': 'floatSlow 20s ease-in-out infinite',
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
        floatSlow: {
          '0%, 100%': { transform: 'translate(0px, 0px)' },
          '33%': { transform: 'translate(22px, -26px)' },
          '66%': { transform: 'translate(-18px, 16px)' },
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
