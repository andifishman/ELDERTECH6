import type { CategoriaNovedad } from '@/services/novedadesService';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "Publicada hoy", "Publicada ayer" o "Publicada el 22 de octubre" — en hora local del celular. */
export function fechaDePublicacion(iso: string): string {
  const fecha = new Date(iso);
  const hoy = new Date();
  const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicioDelDia(hoy) - inicioDelDia(fecha)) / 86_400_000);
  if (dias === 0) return 'Publicada hoy';
  if (dias === 1) return 'Publicada ayer';
  return `Publicada el ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** "sábado 25 de octubre, 16:30 hs" — hora local; sin la hora si es medianoche. */
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
