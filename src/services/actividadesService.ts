import { supabase, ORG_ID } from './supabase';
import type { ActividadCompleta, ActividadConPrioridad, PatronRecurrencia } from '@/types/database.types';
import { toSupabaseDate } from '@/utils/dateUtils';

const ACTIVIDAD_SELECT = `
  *,
  tipo_actividad:tipos_actividad(*),
  ubicacion:ubicaciones(*),
  responsable:responsables(*),
  actividad_intereses(interes_id)
`;

// Devuelve todas las actividades para una fecha dada.
// Con el enfoque multi-row cada ocurrencia tiene su propia fila en la DB
// con la fecha exacta → basta un query simple por fecha.
async function fetchActividadesPorFecha(fechaStr: string): Promise<ActividadCompleta[]> {
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

export async function getActividadesPorFecha(fecha: Date): Promise<ActividadCompleta[]> {
  return fetchActividadesPorFecha(toSupabaseDate(fecha));
}

/**
 * Devuelve las actividades del día con prioridad personalizada según
 * los intereses y la sección del residente.
 *
 * Prioridades:
 *  1 = ⭐ Recomendado: coincide interés + sección (o sin restricción de sección)
 *  2 = Coincide interés, sección no aplica
 *  3 = General (sin filtro de interés)
 */
export async function getActividadesPersonalizadas(
  fecha: Date,
  misInteresesIds: string[],
  miSeccion: string | null,
): Promise<ActividadConPrioridad[]> {
  const fechaStr = toSupabaseDate(fecha);
  const actividades = await fetchActividadesPorFecha(fechaStr);

  const actividadesTyped = actividades as Array<ActividadCompleta & { actividad_intereses: Array<{ interes_id: string }> }>;

  const resultado = actividadesTyped
    .filter((a) => {
      const actSecciones: string[] | null = a.secciones_objetivo ?? null;
      const actIntereses = a.actividad_intereses?.map((ai) => ai.interes_id) ?? [];

      const seccionOk = !miSeccion || !actSecciones?.length || actSecciones.includes(miSeccion);
      const interestOk = actIntereses.length === 0 || actIntereses.some((id) => misInteresesIds.includes(id));

      return seccionOk && interestOk;
    })
    .map((a) => {
      const actIntereses = a.actividad_intereses?.map((ai) => ai.interes_id) ?? [];
      const actSecciones: string[] | null = a.secciones_objetivo ?? null;

      const matchesInterest = actIntereses.length > 0 && actIntereses.some((id) => misInteresesIds.includes(id));
      const hasSeccionTarget = !!actSecciones?.length;
      const matchesSeccion = !hasSeccionTarget || (!!miSeccion && actSecciones!.includes(miSeccion));

      let prioridad: 1 | 2 | 3;
      let recomendada: boolean;

      if (matchesInterest && matchesSeccion && hasSeccionTarget) {
        prioridad = 1;
        recomendada = true;
      } else if (matchesInterest) {
        prioridad = 2;
        recomendada = false;
      } else {
        prioridad = 3;
        recomendada = false;
      }

      return { ...a, prioridad, recomendada } satisfies ActividadConPrioridad;
    });

  return resultado.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
}

// Resultado compacto para el asistente IA
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
 */
export async function buscarActividadesPorTexto(
  busqueda: string,
  fecha: Date,
): Promise<ActividadParaIA[]> {
  const fechaStr = toSupabaseDate(fecha);
  const todas = await fetchActividadesPorFecha(fechaStr);

  const filtradas = busqueda.trim()
    ? todas.filter((a) => a.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : todas;

  return filtradas.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    hora_inicio: a.hora_inicio,
    hora_fin: a.hora_fin ?? '',
    lugar: (a as unknown as { ubicacion?: { nombre?: string } }).ubicacion?.nombre ?? '',
    descripcion: a.descripcion ?? '',
  }));
}

export async function getActividadById(id: string): Promise<ActividadCompleta | null> {
  const queryPromise = supabase
    .from('actividades')
    .select(ACTIVIDAD_SELECT)
    .eq('id', id)
    .single()
    .then(({ data, error }) => {
      if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
      return data as ActividadCompleta | null;
    });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('La actividad tardó demasiado en cargar. Verificá tu conexión.')), 8000),
  );

  return Promise.race([queryPromise, timeoutPromise]);
}
