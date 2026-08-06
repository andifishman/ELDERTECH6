// Normalización de texto para búsquedas server-side — ignora mayúsculas/minúsculas
// y tildes (Postgres ILIKE no lo hace por sí solo sin la extensión unaccent).

/** Minúsculas + sin diacríticos (tildes, diéresis) — "Andrés" → "andres". */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** true si `texto` contiene `query`, ignorando mayúsculas/minúsculas y tildes. */
export function coincideBusqueda(texto: string, query: string): boolean {
  if (!query.trim()) return true;
  return normalizarTexto(texto).includes(normalizarTexto(query));
}
