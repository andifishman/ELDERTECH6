export interface RadioStation {
  id: string;
  nombre: string;
  descripcion: string | null;
  urlStream: string;
  urlFallback: string | null;   // URL alternativa si la principal falla
  urlLogo: string | null;
  pais: string;
  paisNombre: string | null;
  paisEmoji: string | null;
  ciudad: string | null;
  genero: string | null;
  esDestacada: boolean;
  categoriaId: string | null;
  categoria: string | null;
  categoriaEmoji: string | null;
}

export interface CategoriaRadio {
  id: string;
  nombre: string;
  emoji: string | null;
  orden: number;
}

export interface PaisRadio {
  id: string;
  codigo: string;
  nombre: string;
  emojiBandera: string | null;
  orden: number;
}

export interface RadioData {
  radios: RadioStation[];
  categorias: CategoriaRadio[];
  paises: PaisRadio[];
}

export type RadioPlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export const PAIS_LABELS: Record<string, string> = {
  AR: 'Argentina',
  IL: 'Israel',
  US: 'Estados Unidos',
  ES: 'España',
  MX: 'México',
  UY: 'Uruguay',
  CL: 'Chile',
  BR: 'Brasil',
} as const;

export const PAIS_FLAGS: Record<string, string> = {
  AR: '🇦🇷',
  IL: '🇮🇱',
  US: '🇺🇸',
  ES: '🇪🇸',
  MX: '🇲🇽',
  UY: '🇺🇾',
  CL: '🇨🇱',
  BR: '🇧🇷',
} as const;
