import { supabase, ORG_ID } from './supabase';
import type { ActividadCompleta, ActividadConPrioridad, PatronRecurrencia, PrioridadActividad } from '@/types/database.types';
import { toSupabaseDate } from '@/utils/dateUtils';

const ACTIVIDAD_SELECT = `
  *,
  tipo_actividad:tipos_actividad(*),
  ubicacion:ubicaciones(*),
  responsable:responsables(*),
  actividad_residentes_override(residente_id, incluido)
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
 * Devuelve las actividades del día visibles para este residente, según su
 * piso y las excepciones puntuales cargadas desde el backoffice.
 *
 * Regla de visibilidad para cada actividad:
 *  - Si el residente tiene una excepción explícita → manda la excepción
 *    (incluido=true la muestra igual, incluido=false la oculta igual).
 *  - Si no hay excepción → se muestra si no tiene pisos objetivo, o si el
 *    piso del residente está entre los pisos objetivo.
 *
 * Prioridad/recomendada: 1 (⭐) cuando la actividad apunta a un piso
 * específico y el residente coincide (o fue incluido por excepción);
 * 3 = general (sin restricción de piso).
 */
export async function getActividadesPersonalizadas(
  fecha: Date,
  residenteId: string,
  miPiso: string | null,
): Promise<ActividadConPrioridad[]> {
  const fechaStr = toSupabaseDate(fecha);
  const actividades = await fetchActividadesPorFecha(fechaStr);

  const actividadesTyped = actividades as Array<
    ActividadCompleta & { actividad_residentes_override: Array<{ residente_id: string; incluido: boolean }> }
  >;

  const resultado = actividadesTyped
    .map((a) => {
      const actPisos: string[] | null = a.pisos_objetivo ?? null;
      const hasPisoTarget = !!actPisos?.length;
      const matchesPiso = !hasPisoTarget || (!!miPiso && actPisos!.includes(miPiso));

      const override = a.actividad_residentes_override?.find((o) => o.residente_id === residenteId);
      const visible = override ? override.incluido : matchesPiso;

      const prioridad: PrioridadActividad = hasPisoTarget && (override?.incluido ?? matchesPiso) ? 1 : 3;
      const recomendada = prioridad === 1;

      return { actividad: a, visible, prioridad, recomendada };
    })
    .filter((r) => r.visible)
    .map(({ actividad, prioridad, recomendada }) => ({ ...actividad, prioridad, recomendada }) satisfies ActividadConPrioridad);

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
