// Fechas siempre en hora de Argentina y en español rioplatense.
const ZONA = 'America/Argentina/Buenos_Aires';

export const fechaLarga = (iso: string): string => new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA });
export const fechaCorta = (iso: string): string => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: ZONA });
export const hora = (iso: string): string => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA });
export const fechaHora = (iso: string): string => `${fechaCorta(iso)}, ${hora(iso)} hs`;

/** "Hoy", "Ayer" o la fecha — para listas de mensajes. */
export function fechaRelativa(iso: string): string {
  const dia = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: ZONA });
  const hoy = new Date();
  const ayer = new Date(Date.now() - 86_400_000);
  const fecha = new Date(iso);
  if (dia(fecha) === dia(hoy)) return hora(iso);
  if (dia(fecha) === dia(ayer)) return 'Ayer';
  return fechaCorta(iso);
}

/** AAAA-MM-DD de hoy en Argentina. */
export function hoyISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

/** Nombre del día de la semana de una fecha AAAA-MM-DD, sin tildes (igual que el feed del Hogar). */
export function diaSinTildes(iso: string): string {
  return NOMBRES_DIAS[new Date(`${iso}T12:00:00Z`).getUTCDay()]!.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export const sinTildes = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export const mesActual = (): string => hoyISO().slice(0, 7);

export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const nombreMes = (mes: string): string => new Date(`${mes}-01T12:00:00Z`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const nombreCompleto = (r: { nombre: string; apellido: string }): string => `${r.nombre} ${r.apellido}`.trim();

/** Saludo según la hora en Argentina. */
export function saludo(): string {
  const hora = Number(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: ZONA }).slice(0, 2));
  return hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
}

/** Minutos desde las 00:00 de hoy, en hora de Argentina. */
export function minutosAhora(): number {
  const [h, m] = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA }).split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** "jueves 6 de noviembre" */
export const fechaHoyLarga = (): string => new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA });
