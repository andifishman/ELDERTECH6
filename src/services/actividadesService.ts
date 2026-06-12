import { supabase, ORG_ID } from './supabase';
import type { ActividadCompleta, ActividadConPrioridad } from '@/types/database.types';
import { toSupabaseDate } from '@/utils/dateUtils';

const ACTIVIDAD_SELECT = `
  *,
  tipo_actividad:tipos_actividad(*),
  ubicacion:ubicaciones(*),
  responsable:responsables(*),
  actividad_intereses(interes_id)
`;

export async function getActividadesPorFecha(fecha: Date): Promise<ActividadCompleta[]> {
  const fechaStr = toSupabaseDate(fecha);

  const { data, error } = await supabase
    .from('actividades')
    .select(ACTIVIDAD_SELECT)
    .eq('organizacion_id', ORG_ID)
    .eq('fecha', fechaStr)
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });

  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);
  return (data ?? []) as ActividadCompleta[];
}

/**
 * Devuelve las actividades del día con prioridad personalizada según
 * los intereses y el piso del residente.
 *
 * Prioridades:
 *  1 = ⭐ Recomendado: coincide interés + piso (o sin restricción de piso)
 *  2 = Coincide interés, piso no aplica
 *  3 = General (sin filtro de interés)
 *  4 = Sin coincidencia
 */
export async function getActividadesPersonalizadas(
  fecha: Date,
  misInteresesIds: string[],
  miPiso: string | null,
): Promise<ActividadConPrioridad[]> {
  const fechaStr = toSupabaseDate(fecha);

  const { data, error } = await supabase
    .from('actividades')
    .select(ACTIVIDAD_SELECT)
    .eq('organizacion_id', ORG_ID)
    .eq('fecha', fechaStr)
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });

  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);

  const actividades = (data ?? []) as Array<ActividadCompleta & { actividad_intereses: Array<{ interes_id: string }> }>;

  const resultado = actividades
    .filter((a) => {
      const actPisos: string[] | null = a.pisos_objetivo ?? null;
      const actIntereses = a.actividad_intereses?.map((ai) => ai.interes_id) ?? [];

      // Piso filter: show only activities for the user's piso OR for everyone.
      // If user has no piso assigned, show everything.
      const pisoOk = !miPiso || !actPisos?.length || actPisos.includes(miPiso);

      // Interest filter: show general activities (no interests) OR activities
      // that match at least one interest the user chose.
      const interestOk = actIntereses.length === 0 || actIntereses.some((id) => misInteresesIds.includes(id));

      return pisoOk && interestOk;
    })
    .map((a) => {
      const actIntereses = a.actividad_intereses?.map((ai) => ai.interes_id) ?? [];
      const actPisos: string[] | null = a.pisos_objetivo ?? null;

      const matchesInterest = actIntereses.length > 0 && actIntereses.some((id) => misInteresesIds.includes(id));
      // After the filter above, pisoOk is always true here — recomendada only when
      // the activity also has an explicit piso match (not just "for everyone").
      const hasPisoTarget = !!actPisos?.length;
      const matchesPiso = !hasPisoTarget || (!!miPiso && actPisos!.includes(miPiso));

      let prioridad: 1 | 2 | 3;
      let recomendada: boolean;

      if (matchesInterest && matchesPiso && hasPisoTarget) {
        prioridad = 1; // ⭐ interest + piso match
        recomendada = true;
      } else if (matchesInterest) {
        prioridad = 2; // interest match, general piso
        recomendada = false;
      } else {
        prioridad = 3; // general activity (no interest filter)
        recomendada = false;
      }

      return { ...a, prioridad, recomendada } satisfies ActividadConPrioridad;
    });

  return resultado.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
}

// Resultado compacto para el asistente IA — solo campos relevantes
export interface ActividadParaIA {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  descripcion: string;
}

/**
 * Búsqueda de texto libre para el asistente IA.
 * Devuelve una lista compacta de actividades para el día dado,
 * opcionalmente filtradas por nombre con ILIKE.
 */
export async function buscarActividadesPorTexto(
  busqueda: string,
  fecha: Date,
): Promise<ActividadParaIA[]> {
  const fechaStr = toSupabaseDate(fecha);

  let query = supabase
    .from('actividades')
    .select('id, nombre, hora_inicio, hora_fin, descripcion, ubicaciones(nombre)')
    .eq('organizacion_id', ORG_ID)
    .eq('fecha', fechaStr)
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });

  if (busqueda.trim()) {
    query = query.ilike('nombre', `%${busqueda.trim()}%`);
  }

  const { data, error } = await query;
  if (error) return [];

  return (data ?? []).map((a) => ({
    id: a.id as string,
    nombre: a.nombre as string,
    hora_inicio: a.hora_inicio as string,
    hora_fin: a.hora_fin as string,
    lugar: ((a.ubicaciones as { nombre?: string } | null)?.nombre) ?? '',
    descripcion: (a.descripcion as string | null) ?? '',
  }));
}

export async function getActividadById(id: string): Promise<ActividadCompleta | null> {
  const { data, error } = await supabase
    .from('actividades')
    .select(ACTIVIDAD_SELECT)
    .eq('id', id)
    .single();

  if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
  return data as ActividadCompleta | null;
}
