export interface SearchInput {
  consulta: string;
  /**
   * Prioriza resultados recientes (últimas semanas) y pide las fechas de
   * publicación. Para preguntas del tipo "el último partido", "qué pasó hoy",
   * "cómo salió ayer" — donde una fuente vieja da una respuesta directamente
   * equivocada, no incompleta.
   */
  soloReciente?: boolean;
}

export interface SearchFuente {
  titulo: string;
  url: string;
  extracto: string;
  /** Fecha de publicación cuando la fuente la informa — deja que el modelo elija la más nueva. */
  fecha?: string;
}

/** DTO normalizado — el mismo shape sin importar qué proveedor de búsqueda respondió. */
export interface SearchOutput {
  respuesta: string | null;
  fuentes: SearchFuente[];
}
