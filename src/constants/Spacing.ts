//sistema de espaciado con base 4px y tamaños táctiles mínimos de 48px para adultos mayores
// Sistema de espaciado — base 4px
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,

  // Radios de borde
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
  },

  // Tamaños mínimos de toque (WCAG 2.5.5 — al menos 44×44pt)
  touch: {
    min: 48,
    comfortable: 56,
    large: 72,
  },

  // Padding estándar de pantalla
  screen: {
    horizontal: 16,
    vertical: 16,
  },

  // Padding de tarjeta
  card: {
    horizontal: 16,
    vertical: 16,
  },

  // Header height
  header: 60,
} as const;
