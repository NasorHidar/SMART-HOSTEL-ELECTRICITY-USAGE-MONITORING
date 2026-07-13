/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eefbf3',
          100: '#d6f5e3',
          200: '#b0eacb',
          300: '#7dd8aa',
          400: '#48be84',
          500: '#25a265',
          600: '#188251',
          700: '#146843',
          800: '#125337',
          900: '#10452e',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          card:    'var(--surface-card)',
          border:  'var(--surface-border)',
          hover:   'var(--surface-hover)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.5s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'ripple':     'ripple 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'soundwave':  'soundwave 0.5s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: 1 },
          '100%': { transform: 'scale(2.5)', opacity: 0 },
        },
        soundwave: {
          '0%': { transform: 'scaleY(0.3)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
};
