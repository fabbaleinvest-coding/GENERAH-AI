import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from the GENERAH AI logo
        ink: {
          DEFAULT: '#0B1622', // deepest navy — primary dark bg
          900: '#0E1B2A',
          800: '#13243A',
          700: '#1A2F49',
          600: '#243E5C',
        },
        navy: {
          DEFAULT: '#16273A',
          light: '#22384F',
        },
        teal: {
          DEFAULT: '#1B5E54', // logo deep petrol green
          deep: '#134A42',
          600: '#1E6A5E',
          500: '#2A8576',
          400: '#34A48F', // bright accent
          300: '#52C2AB',
          200: '#8AD9C9',
        },
        bone: {
          DEFAULT: '#F6F5F1', // warm off-white
          dim: '#ECEAE3',
        },
        mist: '#A8B6C2', // muted slate text on dark
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter: '-0.03em',
      },
      maxWidth: {
        content: '1180px',
        wide: '1340px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fade-in 1.2s ease forwards',
        'pulse-ring': 'pulse-ring 2.8s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        'shimmer': 'shimmer 6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
