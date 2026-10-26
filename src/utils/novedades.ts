import type { CategoriaNovedad } from '@/services/novedadesService';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** true si el evento es hoy (en hora local del celular). */
export function eventoEsHoy(iso: string): boolean {
  const f = new Date(iso);
  const h = new Date();
  return f.getFullYear() === h.getFullYear() && f.getMonth() === h.getMonth() && f.getDate() === h.getDate();
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** "Sábado 25 de octubre, 16:30 hs" — hora local; sin la hora si es medianoche. */
export function fechaDeEvento(iso: string): string {
  const f = new Date(iso);
  const hora = f.getHours() === 0 && f.getMinutes() === 0 ? '' : `, ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')} hs`;
  return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}${hora}`;
}

export const CATEGORIAS_NOVEDAD: Record<CategoriaNovedad, { emoji: string; nombre: string }> = {
  general: { emoji: '📰', nombre: 'Novedad' },
  evento: { emoji: '🎉', nombre: 'Evento' },
  salud: { emoji: '🩺', nombre: 'Salud' },
  comida: { emoji: '🍽️', nombre: 'Comida' },
  cumpleanos: { emoji: '🎂', nombre: 'Cumpleaños' },
  visita: { emoji: '👪', nombre: 'Visitas' },
  aviso: { emoji: '📢', nombre: 'Aviso importante' },
};
