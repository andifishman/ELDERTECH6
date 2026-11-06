// Cruza la sección del residente (como se carga en el backoffice: "1 AC", "3B") con los sectores del feed
// del Hogar ("1AC", "3ABC"). Es la MISMA regla que usa la app de residentes en `src/utils/pisoHogar.ts`:
// si cambia una, cambia la otra (el feed identifica por nombre, no por id).
const normalizar = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toUpperCase();

// Secciones cuyo nombre en el feed es distinto; el resto coincide al sacarle los espacios.
const EQUIVALENCIAS: Record<string, string> = {
  '2REHABILITACION': 'REHAB',
  '3AC': '3ABC',
  '3B': '3ABC',
};

/** Sector del feed que le corresponde al residente, o null si no se puede determinar. */
export function sectorDeSeccion(seccion: string | null | undefined): string | null {
  if (!seccion) return null;
  const clave = normalizar(seccion);
  return EQUIVALENCIAS[clave] ?? clave;
}

export function perteneceAlSector(sectoresActividad: string[], sector: string): boolean {
  return sectoresActividad.some((s) => normalizar(s) === sector);
}

/**
 * Deja las actividades que le corresponden al piso del residente. Una actividad sin sectores es para todo el
 * hogar. Si el piso del residente no existe en la grilla (o no se conoce), se devuelve todo — igual que la app.
 */
export function filtrarPorPiso<T extends { sectores: string[] }>(actividades: T[], seccion: string | null | undefined): T[] {
  const sector = sectorDeSeccion(seccion);
  if (!sector || !actividades.some((a) => perteneceAlSector(a.sectores, sector))) return actividades;
  return actividades.filter((a) => a.sectores.length === 0 || perteneceAlSector(a.sectores, sector));
}
