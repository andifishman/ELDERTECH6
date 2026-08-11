export interface SearchInput {
  consulta: string;
}

export interface SearchFuente {
  titulo: string;
  url: string;
  extracto: string;
}

/** DTO normalizado — el mismo shape sin importar qué proveedor de búsqueda respondió. */
export interface SearchOutput {
  respuesta: string | null;
  fuentes: SearchFuente[];
}
