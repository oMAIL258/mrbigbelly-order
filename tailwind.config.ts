import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        rule: 'var(--rule)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        veg: 'var(--veg)',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
