// ========================================
// SERVICIO: Novedades
// DESCRIPCIÓN:
// Noticias de la residencia que ven los residentes en el botón
// "Novedades" de la app. Se pueden publicar ahora o programar para una
// fecha y hora, guardar como borrador, fijar arriba, clasificar por
// categoría y mandar un aviso al celular (se registra como una
// notificación más).
// ========================================
import { apiClient } from '@/lib/apiClient';
import { optimizarImagen } from './articulosService';

export type CategoriaNovedad = 'general' | 'evento' | 'salud' | 'comida' | 'cumpleanos' | 'visita' | 'aviso';

export const CATEGORIAS_NOVEDAD: Array<{ id: CategoriaNovedad; emoji: string; nombre: string }> = [
  { id: 'general', emoji: '📰', nombre: 'Novedad' },
  { id: 'evento', emoji: '🎉', nombre: 'Evento' },
  { id: 'salud', emoji: '🩺', nombre: 'Salud' },
  { id: 'comida', emoji: '🍽️', nombre: 'Comida' },
  { id: 'cumpleanos', emoji: '🎂', nombre: 'Cumpleaños' },
  { id: 'visita', emoji: '👪', nombre: 'Visitas' },
  { id: 'aviso', emoji: '📢', nombre: 'Aviso importante' },
];

export const categoriaDe = (id: CategoriaNovedad) => CATEGORIAS_NOVEDAD.find((c) => c.id === id) ?? CATEGORIAS_NOVEDAD[0];

/** Cuánto tiempo se muestra desde que se publica. */
export const DURACIONES_NOVEDAD: Array<{ dias: number; texto: string }> = [
  { dias: 3, texto: '3 días' },
  { dias: 7, texto: '1 semana' },
  { dias: 15, texto: '15 días' },
  { dias: 30, texto: '1 mes' },
  { dias: 60, texto: '2 meses' },
  { dias: 90, texto: '3 meses' },
];

export interface Novedad {
  id: string;
  organizacion_id: string;
  titulo: string;
  texto: string;
  imagen_url: string | null;
  /** null = para todos los residentes */
  grupo_ids: string[] | null;
  visible_hasta: string;
  /** Desde cuándo se ve en la app (a futuro = programada) */
  publicar_en: string;
  es_borrador: boolean;
  fijada: boolean;
  categoria: CategoriaNovedad;
  fecha_evento: string | null;
  notificacion_id: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface NovedadConLecturas extends Novedad {
  cantidad_lecturas: number;
  /** A cuántos residentes les llega */
  cantidad_destinatarios: number;
}

export type EstadoNovedad = 'borrador' | 'programada' | 'publicada' | 'vencida';

/** En qué momento de su vida está una novedad, según las fechas y el borrador. */
export function estadoDe(n: Pick<Novedad, 'es_borrador' | 'publicar_en' | 'visible_hasta'>, ahora = Date.now()): EstadoNovedad {
  if (n.es_borrador) return 'borrador';
  if (new Date(n.visible_hasta).getTime() <= ahora) return 'vencida';
  if (new Date(n.publicar_en).getTime() > ahora) return 'programada';
  return 'publicada';
}

export interface PublicarNovedadInput {
  titulo: string;
  texto: string;
  imagenUrl: string | null;
  /** Vacío = para todos los residentes */
  grupoIds: string[];
  notificar: boolean;
  categoria: CategoriaNovedad;
  fijada: boolean;
  /** ISO. null = ahora */
  publicarEn: string | null;
  duracionDias?: number;
  /** ISO. Hasta cuándo se ve (el día del evento inclusive) */
  visibleHasta?: string;
  /** ISO */
  fechaEvento: string | null;
  borrador: boolean;
}

export interface EditarNovedadInput {
  titulo?: string;
  texto?: string;
  imagenUrl?: string | null;
  categoria?: CategoriaNovedad;
  fijada?: boolean;
  fechaEvento?: string | null;
  publicarEn?: string;
  visibleHasta?: string;
}

export async function listarNovedades(): Promise<NovedadConLecturas[]> {
  return apiClient.get<NovedadConLecturas[]>('/api/admin/novedades');
}

export async function obtenerNovedad(id: string): Promise<Novedad> {
  return apiClient.get<Novedad>(`/api/admin/novedades/${id}`);
}

export async function publicarNovedad(input: PublicarNovedadInput): Promise<Novedad> {
  return apiClient.post<Novedad>('/api/admin/novedades', input);
}

export async function editarNovedad(id: string, input: EditarNovedadInput): Promise<Novedad> {
  return apiClient.patch<Novedad>(`/api/admin/novedades/${id}`, input);
}

/** Pasa un borrador a publicada: ahora o a una fecha, con o sin aviso. */
export async function publicarBorrador(id: string, input: { notificar: boolean; publicarEn?: string | null; duracionDias?: number; visibleHasta?: string }): Promise<Novedad> {
  return apiClient.post<Novedad>(`/api/admin/novedades/${id}/publicar`, input);
}

export async function reenviarAviso(id: string): Promise<Novedad> {
  return apiClient.post<Novedad>(`/api/admin/novedades/${id}/reenviar-aviso`, {});
}

export async function eliminarNovedad(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/admin/novedades/${id}`);
}

/** Achica la foto y la sube; devuelve la URL pública. */
export async function subirFotoNovedad(archivo: File): Promise<string> {
  const form = new FormData();
  form.append('archivo', await optimizarImagen(archivo));
  const { url } = await apiClient.postForm<{ url: string }>('/api/admin/novedades/images', form);
  return url;
}
