// Escala tipográfica optimizada para adultos mayores
// Tamaños mínimos: body 18px, labels 16px, headings 22px+
export const Typography = {
  // Tamaños
  size: {
    xs: 13,
    sm: 15,
    md: 18,     // body mínimo
    lg: 20,
    xl: 24,
    xxl: 32,
    display: 48, // temperatura en Clima
  },

  // Pesos
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },

  // Altura de línea (line height) — más generoso para legibilidad
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Estilos predefinidos
  styles: {
    // Encabezados de pantalla
    screenTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    // Subtítulo de pantalla
    screenSubtitle: {
      fontSize: 13,
      fontWeight: '400' as const,
      color: 'rgba(255,255,255,0.8)',
    },
    // Nombre de tarjeta principal (Horarios, Llamar, etc.)
    cardTitle: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: '#FFFFFF',
    },
    // Nombre de tarjeta pequeña
    cardTitleSmall: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    // Hora en actividad
    activityTime: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    // Nombre de actividad
    activityName: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: '#212121',
    },
    // Body principal
    body: {
      fontSize: 17,
      fontWeight: '400' as const,
      color: '#212121',
      lineHeight: 26,
    },
    // Label pequeño
    label: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: '#616161',
    },
    // Botón "Escuchar"
    speakLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
  },
} as const;
