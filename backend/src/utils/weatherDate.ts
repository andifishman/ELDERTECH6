const DIAS_COMPLETO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function esMismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Porteo de getLabelDia (src/utils/dateUtils.ts) — 'Hoy', 'Mañana' o el nombre corto del día. */
export function getLabelDia(fecha: Date, referencia: Date): string {
  if (esMismoDia(fecha, referencia)) return 'Hoy';
  const manana = new Date(referencia);
  manana.setDate(referencia.getDate() + 1);
  if (esMismoDia(fecha, manana)) return 'Mañana';
  return capitalizar(DIAS_COMPLETO[fecha.getDay()]!.slice(0, 3));
}
