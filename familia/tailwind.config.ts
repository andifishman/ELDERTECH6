import type { Config } from 'tailwindcss';

// Letra grande y alto contraste: la app la usan familiares de cualquier edad.
// Violeta de marca ElderTech (#5F3E88), el mismo de la app de residentes y el backoffice.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5F3E88',
          50: '#F2EEF8',
          100: '#E0D7EE',
          200: '#C3B2DD',
          500: '#6E4D9C',
          600: '#5F3E88',
          700: '#4F3372',
          800: '#3F2960',
        },
        ink: '#1F2937',
        soft: '#4B5563',
      },
      fontSize: {
        base: ['1.125rem', { lineHeight: '1.65rem' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        xs: ['0.9375rem', { lineHeight: '1.35rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.5rem', { lineHeight: '2rem' }],
        '2xl': ['1.75rem', { lineHeight: '2.25rem' }],
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
} satisfies Config;
