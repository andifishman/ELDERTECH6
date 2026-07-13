import { getSupabaseAdmin } from './supabaseAdmin';

/** Resuelve la organización de un residente — la necesitan Actividades y Clima para filtrar por org. */
export async function getOrganizacionIdDeResidente(residenteId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('residentes')
    .select('organizacion_id')
    .eq('id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al resolver la organización del residente: ${error.message}`);
  return data?.organizacion_id ?? null;
}

export interface ResidenteContext {
  organizacionId: string | null;
  seccion: string | null;
}

/** Organización + sección del residente — la necesita Actividades para el algoritmo de visibilidad. */
export async function getResidenteContext(residenteId: string): Promise<ResidenteContext> {
  const { data, error } = await getSupabaseAdmin()
    .from('residentes')
    .select('organizacion_id, seccion')
    .eq('id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al resolver el residente: ${error.message}`);
  return { organizacionId: data?.organizacion_id ?? null, seccion: data?.seccion ?? null };
}
