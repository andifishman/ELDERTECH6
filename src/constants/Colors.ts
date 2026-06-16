//paleta de colores centralizada del proyecto ElderTech — diseño de Figma
// Design tokens extraídos del Figma ElderTech y capturas de referencia
export const Colors = {
  // Marca principal
  brand: {
    greenDark: '#1B5E3B',   // Header, AppBar — verde oscuro principal
    greenMedium: '#2E7D32', // Botón Llamar
    red: '#D32F2F',         // Botón Horarios, header Horarios
    purple: '#6A1B9A',      // Botón Artículos
    blueDark: '#0D47A1',    // Botón Asistente
    orange: '#E65100',      // Botón Más
  },

  // Colores de actividades en Horarios
  activity: {
    morning: '#3F51B5',        // Azul-índigo — actividades mañana (antes de 13hs)
    morningLight: '#5C6BC0',
    afternoon: '#FF8F00',      // Ámbar — actividades tarde (desde 13hs)
    afternoonLight: '#FFB300',
  },

  // Pantalla Clima
  weather: {
    background: '#1565C0',
    card: 'rgba(255,255,255,0.18)',
    cardBorder: 'rgba(255,255,255,0.3)',
  },

  // Pantalla Radio
  radio: {
    playButton: '#2E7D32',
    playButtonActive: '#1B5E3B',
    nowPlayingBg: '#1B5E3B',
  },

  // Módulo Tutoriales — acentos sobre el violeta de brand.purple
  tutoriales: {
    soft: '#F3E5F5',     // fondo violeta suave — "Qué vas a aprender", placeholders
    amber: '#9A6B12',    // texto del cartel de tip
    amberBg: '#FBF3DF',  // fondo del cartel de tip
  },

  // UI general
  ui: {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    separator: '#D32F2F', // línea roja separadora en pantalla Más
    disabled: '#BDBDBD',
    overlay: 'rgba(0,0,0,0.4)',
  },

  // Texto
  text: {
    primary: '#212121',
    secondary: '#616161',
    hint: '#9E9E9E',
    onDark: '#FFFFFF',
    onDarkSecondary: 'rgba(255,255,255,0.75)',
  },

  // Botón "Escuchar" (TTS)
  speak: {
    idle: '#1565C0',          // Azul — inactivo
    idleBg: 'rgba(21,101,192,0.12)',
    active: '#E65100',        // Naranja — reproduciendo
    activeBg: 'rgba(230,81,0,0.12)',
    onDark: '#FFFFFF',        // Sobre fondos oscuros
    onDarkBg: 'rgba(255,255,255,0.2)',
  },
} as const;

export type ColorKey = keyof typeof Colors;
