const DIAS_LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DIAS_COMPLETO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "Lunes, 7 de abril de 2026" */
export function formatFechaLarga(fecha: Date): string {
  const dia = DIAS_COMPLETO[fecha.getDay()];
  return `${capitalizar(dia)}, ${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

/** "7 de abril de 2026" */
export function formatFechaCorta(fecha: Date): string {
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

/** Letra del día: 'L', 'M', 'M', 'J', 'V', 'S', 'D' */
export function getDiaLetra(fecha: Date): string {
  return DIAS_LETRA[fecha.getDay()];
}

/** Nombre corto para pronóstico: 'Hoy', 'Mañana', 'Lun', 'Mar', ... */
export function getLabelDia(fecha: Date, referencia: Date): string {
  if (esMismodia(fecha, referencia)) return 'Hoy';
  const manana = new Date(referencia);
  manana.setDate(referencia.getDate() + 1);
  if (esMismodia(fecha, manana)) return 'Mañana';
  const letra = DIAS_LETRA[fecha.getDay()];
  return capitalizar(letra === 'D' ? 'Dom' : DIAS_COMPLETO[fecha.getDay()].slice(0, 3));
}

/** Devuelve los 7 días de la semana (lunes a domingo) que contienen `referencia` */
export function getSemana(referencia: Date): Date[] {
  const diaSemana = referencia.getDay(); // 0=Dom
  const lunes = new Date(referencia);
  lunes.setDate(referencia.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });
}

/** Devuelve 9 días: 2 anteriores + hoy + 6 siguientes, centrado en `hoy` */
export function getVentanaDias(hoy: Date): Date[] {
  return Array.from({ length: 9 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - 2 + i);
    return d;
  });
}

export function esMismodia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Convierte a string 'YYYY-MM-DD' para queries Supabase */
export function toSupabaseDate(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Extrae horas y minutos de 'HH:MM:SS' */
export function parseHora(hora: string): { horas: number; minutos: number } {
  const partes = hora.split(':').map(Number);
  return { horas: partes[0], minutos: partes[1] };
}

/** Formatea hora como 'HH:MM' */
export function formatHora(hora: string): string {
  const { horas, minutos } = parseHora(hora);
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/** Actividades antes de las 12hs se consideran "mañana" */
export function esMañana(horaInicio: string): boolean {
  const { horas } = parseHora(horaInicio);
  return horas < 12;
}

/** Retorna Age a partir de fecha_nacimiento 'YYYY-MM-DD' */
export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
