//cruza la sección del residente (como se carga en el backoffice: "1 AC", "3B") con los sectores
//del feed del hogar ("1AC", "3ABC"). El feed identifica por nombre, no por id.
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toUpperCase();

//secciones cuyo nombre en el feed es distinto; el resto coincide al sacarle los espacios
const EQUIVALENCIAS: Record<string, string> = {
  '2REHABILITACION': 'REHAB',
  '3AC': '3ABC',
  '3B': '3ABC',
};

//sector del feed que le corresponde al residente, o null si no se puede determinar
export function sectorDeMiPiso(seccion: string | null | undefined): string | null {
  if (!seccion) return null;
  const clave = normalizar(seccion);
  return EQUIVALENCIAS[clave] ?? clave;
}

export function perteneceAlSector(sectoresActividad: string[], sector: string): boolean {
  return sectoresActividad.some((s) => normalizar(s) === sector);
}
