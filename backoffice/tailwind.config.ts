// ========================================
// CONFIG: Tailwind CSS
// DESCRIPCIÓN:
// Sistema de diseño del backoffice ElderTech.
// La paleta se basa en el violeta de marca de la app
// móvil (#5F3E88) para que ambos productos
// se perciban como un mismo sistema.
// Los colores se exponen como variables CSS (HSL) para
// soportar theming y el patrón de tokens de shadcn/ui.
// ========================================
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Violeta de marca ElderTech — color de acción principal
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#F2EEF8',
          100: '#E0D7EE',
          200: '#C3B2DD',
          300: '#A189C8',
          400: '#8264B0',
          500: '#6E4D9C', // violeta medio (botones)
          600: '#5F3E88', // violeta de marca (sidebar/header)
          700: '#4F3372',
          800: '#3F2960',
          900: '#2C1D44',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Acentos de módulos (heredados de la app móvil)
        brand: {
          red: '#D32F2F',
          purple: '#6A1B9A',
          blue: '#0D47A1',
          orange: '#E65100',
          amber: '#FF8F00',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
