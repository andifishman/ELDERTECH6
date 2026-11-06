// Formatos compartidos por las pantallas de Familias.

const ZONA = 'America/Argentina/Buenos_Aires';

export const fecha = (iso: string): string => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA });

export const fechaCorta = (iso: string): string => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ZONA });

export const fechaHora = (iso: string): string =>
  `${new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: ZONA })}, ${new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA })} hs`;

/** ISO → valor de un <input type="datetime-local"> en hora de Argentina (UTC-3, sin horario de verano). */
export function aInputFechaHora(iso: string | null): string {
  if (!iso) return '';
  return new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 16);
}

/** Valor de un <input type="datetime-local"> (hora de Argentina) → ISO con offset. */
export function deInputFechaHora(valor: string): string {
  return `${valor}:00-03:00`;
}

export const tamano = (bytes: number): string => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

export const MAX_ARCHIVO_MB = 10;
export const excedeTamano = (archivo: File): boolean => archivo.size > MAX_ARCHIVO_MB * 1024 * 1024;
