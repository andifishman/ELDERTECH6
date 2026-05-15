// Tipos para el módulo Radio

export interface RadioStation {
  id: string;
  nombre: string;
  descripcion: string | null;
  urlStream: string;
  urlLogo: string | null;
  pais: string;
  ciudad: string | null;
  genero: string | null;
  esDestacada: boolean;
  categoria: string | null;
  categoriaEmoji: string | null;
}

export interface RadioGroup {
  pais: string;
  paisLabel: string;           // 'Argentina', 'Israel', etc.
  radios: RadioStation[];
}

export type RadioPlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface RadioPlayerStatus {
  state: RadioPlayerState;
  radioActual: RadioStation | null;
  error: string | null;
}

// Mapa de países para etiquetas
export const PAIS_LABELS: Record<string, string> = {
  AR: 'Argentina',
  IL: 'Israel',
  US: 'Estados Unidos',
  ES: 'España',
  MX: 'México',
  UY: 'Uruguay',
  CL: 'Chile',
} as const;
