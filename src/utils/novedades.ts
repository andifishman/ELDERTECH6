import type { Novedad } from '@/services/novedadesService';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** true si el evento es hoy (en hora local del celular). */
export function eventoEsHoy(iso: string): boolean {
  const f = new Date(iso);
  const h = new Date();
  return f.getFullYear() === h.getFullYear() && f.getMonth() === h.getMonth() && f.getDate() === h.getDate();
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** "Sábado 25 de octubre de 2026, 16:30 hs" — hora local; sin la hora si es medianoche. */
export function fechaDeEvento(iso: string): string {
  const f = new Date(iso);
  const hora = f.getHours() === 0 && f.getMinutes() === 0 ? '' : `, ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')} hs`;
  return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}${hora}`;
}

const CATEGORIAS_FIJAS: Record<string, { emoji: string; nombre: string }> = {
  general: { emoji: '📰', nombre: 'Novedad' },
  evento: { emoji: '🎉', nombre: 'Evento' },
  salud: { emoji: '🩺', nombre: 'Salud' },
  comida: { emoji: '🍽️', nombre: 'Comida' },
  cumpleanos: { emoji: '🎂', nombre: 'Cumpleaños' },
  visita: { emoji: '👪', nombre: 'Visitas' },
  aviso: { emoji: '📢', nombre: 'Aviso importante' },
};

/**
 * "🎉 Evento" para mostrar en la tarjeta, o null si es una novedad común.
 * Usa lo que manda el backend (así se ven las categorías que crea la
 * residencia); si no viene, cae en la lista fija.
 */
export function etiquetaCategoria(novedad: Pick<Novedad, 'categoria' | 'categoria_nombre' | 'categoria_emoji'>): string | null {
  const categoria = novedad.categoria ?? 'general';
  if (categoria === 'general') return null;
  const fija = CATEGORIAS_FIJAS[categoria];
  const nombre = novedad.categoria_nombre ?? fija?.nombre;
  if (!nombre) return null;
  return `${novedad.categoria_emoji ?? fija?.emoji ?? '🏷️'} ${nombre}`;
}
