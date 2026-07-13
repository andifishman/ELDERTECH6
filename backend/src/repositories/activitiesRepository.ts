import { getSupabaseAdmin } from './supabaseAdmin';
import { toSupabaseDate } from '../utils/date';
import type { ActividadCompleta } from '../providers/activities/ActivityTypes';

const ACTIVIDAD_SELECT = `
  *,
  tipo_actividad:tipos_actividad(*),
  ubicacion:ubicaciones(*),
  responsable:responsables(*),
  actividad_residentes_override(residente_id, incluido)
`;

/** Porteo de `fetchActividadesPorFecha` (src/services/actividadesService.ts). */
export async function fetchActividadesPorFecha(organizacionId: string, fecha: Date): Promise<ActividadCompleta[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('actividades')
    .select(ACTIVIDAD_SELECT)
    .eq('organizacion_id', organizacionId)
    .eq('fecha', toSupabaseDate(fecha))
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });

  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);
  return (data ?? []) as unknown as ActividadCompleta[];
}

/** Porteo de `getActividadById` (src/services/actividadesService.ts). */
export async function getActividadById(id: string): Promise<ActividadCompleta | null> {
  const { data, error } = await getSupabaseAdmin().from('actividades').select(ACTIVIDAD_SELECT).eq('id', id).maybeSingle();

  if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
  return (data as unknown as ActividadCompleta) ?? null;
}

export interface ActividadParaIA {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  descripcion: string;
}

interface ActividadRow {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string | null;
  descripcion: string | null;
  ubicacion?: { nombre?: string } | null;
}

/**
 * Búsqueda de texto libre de actividades del día — usada por la herramienta
 * `buscar_actividades` del asistente. Porteo directo de la lógica que hoy
 * vive en `src/services/actividadesService.ts` (buscarActividadesPorTexto),
 * ahora resuelta server-side contra la service-role key.
 */
export async function searchActivitiesByText(
  organizacionId: string,
  busqueda: string,
  fecha: Date,
): Promise<ActividadParaIA[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('actividades')
    .select('id, nombre, hora_inicio, hora_fin, descripcion, ubicacion:ubicaciones(nombre)')
    .eq('organizacion_id', organizacionId)
    .eq('fecha', toSupabaseDate(fecha))
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });

  if (error) throw new Error(`Error al buscar actividades: ${error.message}`);

  const filas = (data ?? []) as unknown as ActividadRow[];
  const query = busqueda.trim().toLowerCase();
  const filtradas = query ? filas.filter((a) => a.nombre.toLowerCase().includes(query)) : filas;

  return filtradas.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    hora_inicio: a.hora_inicio,
    hora_fin: a.hora_fin ?? '',
    lugar: a.ubicacion?.nombre ?? '',
    descripcion: a.descripcion ?? '',
  }));
}
