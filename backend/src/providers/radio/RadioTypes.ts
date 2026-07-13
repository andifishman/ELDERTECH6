export interface RadioStation {
  id: string;
  nombre: string;
  descripcion: string | null;
  urlStream: string;
  urlFallback: string | null;
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

/** DTO normalizado — el mismo shape sin importar si el catálogo vino de Supabase o del fallback hardcodeado. */
export interface RadioData {
  radios: RadioStation[];
  categorias: CategoriaRadio[];
  paises: PaisRadio[];
}
