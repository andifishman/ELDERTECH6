//servicio que consulta las actividades desde supabase
import { supabase, ORG_ID } from './supabase';
import type { ActividadCompleta } from '@/types/database.types';
import { toSupabaseDate } from '@/utils/dateUtils';

/**
 * Trae todas las actividades de una fecha para la organización,
 * con joins a tipo_actividad, ubicacion y responsable.
 */
export async function getActividadesPorFecha(fecha: Date): Promise<ActividadCompleta[]> {
  const fechaStr = toSupabaseDate(fecha);

  //consulta actividades del día con sus relaciones
  const { data, error } = await supabase
    .from('actividades')
    .select(`
      *,
      tipo_actividad:tipos_actividad(*),
      ubicacion:ubicaciones(*),
      responsable:responsables(*)
    `)
    .eq('organizacion_id', ORG_ID)
    .eq('fecha', fechaStr)
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });

  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);
  return (data ?? []) as ActividadCompleta[];
}

/**
 * Trae una actividad por ID con todos sus joins.
 */
export async function getActividadById(id: string): Promise<ActividadCompleta | null> {
  //busca una actividad específica por su id
  const { data, error } = await supabase
    .from('actividades')
    .select(`
      *,
      tipo_actividad:tipos_actividad(*),
      ubicacion:ubicaciones(*),
      responsable:responsables(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
  return data as ActividadCompleta | null;
}
