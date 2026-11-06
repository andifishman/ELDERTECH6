import type { Config } from 'tailwindcss';

// Dirección visual: "la mesa de la familia". Cálida, afectuosa y legible.
// El violeta de marca ElderTech (#5F3E88) es el ancla; lo acompañan colores de calidez
// (coral, girasol, verde agua, rosa) y un fondo crema. Cada sección tiene "su" color,
// así se reconoce de un vistazo dónde está uno. Todo texto sobre color cumple contraste AA.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary-600) / <alpha-value>)',
          50: 'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          800: 'rgb(var(--primary-800) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)',
        },
        // Mensajes: lo más cálido, lo que más importa
        coral: { 50: '#FFF1EC', 100: '#FFDDD1', 200: '#FFC0AB', 400: '#F58A66', 600: '#C94B25', 700: '#A93A18' },
        // Calendario: girasol (el texto va en marrón oscuro, nunca blanco)
        sol: { 50: '#FFF8DC', 100: '#FFEEA6', 200: '#FFE070', 400: '#F6B93B', 700: '#7A4B00', 900: '#3D2600' },
        // Fotos: verde agua
        agua: { 50: '#E7F7F4', 100: '#C6EDE6', 200: '#97DCD0', 500: '#23998A', 700: '#146B60' },
        // Avisos y detalles afectuosos
        rosa: { 50: '#FFF0F4', 100: '#FFD9E3', 200: '#FFB8CB', 500: '#D6456B', 700: '#A62C4E' },
        crema: '#FFF9F2',
        ink: '#2A1F3D',
        soft: '#5B5069',
      },
      fontSize: {
        base: ['1.125rem', { lineHeight: '1.7rem' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        xs: ['0.9375rem', { lineHeight: '1.35rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.5rem', { lineHeight: '2rem' }],
        '2xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.6rem' }],
      },
      fontFamily: {
        // Títulos con carácter (serif suave) y cuerpo redondeado y muy legible
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        suave: '0 8px 24px -12px rgba(95, 62, 136, 0.35)',
        calido: '0 10px 28px -14px rgba(201, 75, 37, 0.55)',
      },
      keyframes: {
        subir: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        latido: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.12)' } },
      },
      animation: {
        subir: 'subir 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        latido: 'latido 2.4s ease-in-out infinite',
      },
    },
  },
} satisfies Config;
