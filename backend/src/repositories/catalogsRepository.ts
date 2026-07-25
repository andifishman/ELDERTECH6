import { getSupabaseAdmin } from './supabaseAdmin';

export interface TipoActividad {
  id: string;
  organizacion_id: string | null;
  nombre: string;
  emoji: string | null;
  color: string | null;
  descripcion: string | null;
  activo: boolean;
  hora_inicio_default: string | null;
  hora_fin_default: string | null;
}

export interface Ubicacion {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Responsable {
  id: string;
  organizacion_id: string | null;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  foto_url: string | null;
  es_externo: boolean;
  activo: boolean;
}

export async function findTiposActividad(organizacionId: string): Promise<TipoActividad[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('tipos_actividad')
    .select('*')
    .or(`organizacion_id.is.null,organizacion_id.eq.${organizacionId}`)
    .eq('activo', true)
    .order('nombre');
  if (error) throw new Error(`Error al cargar tipos de actividad: ${error.message}`);
  return (data ?? []) as TipoActividad[];
}

export async function findUbicaciones(organizacionId: string): Promise<Ubicacion[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ubicaciones')
    .select('*')
    .eq('organizacion_id', organizacionId)
    .eq('activo', true)
    .order('nombre');
  if (error) throw new Error(`Error al cargar ubicaciones: ${error.message}`);
  return (data ?? []) as Ubicacion[];
}

export async function findResponsables(organizacionId: string): Promise<Responsable[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('responsables')
    .select('*')
    .or(`organizacion_id.is.null,organizacion_id.eq.${organizacionId}`)
    .eq('activo', true)
    .order('nombre');
  if (error) throw new Error(`Error al cargar responsables: ${error.message}`);
  return (data ?? []) as Responsable[];
}

export async function crearTipoActividad(input: {
  organizacionId: string;
  nombre: string;
  emoji: string | null;
  horaInicioDefault: string | null;
  horaFinDefault: string | null;
}): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from('tipos_actividad')
    .insert({
      nombre: input.nombre,
      emoji: input.emoji,
      hora_inicio_default: input.horaInicioDefault,
      hora_fin_default: input.horaFinDefault,
      organizacion_id: input.organizacionId,
      activo: true,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Error al crear tipo de actividad: ${error.message}`);
  return data.id as string;
}

export async function crearUbicacion(input: { organizacionId: string; nombre: string }): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from('ubicaciones')
    .insert({ nombre: input.nombre, organizacion_id: input.organizacionId, activo: true })
    .select('id')
    .single();
  if (error) throw new Error(`Error al crear ubicación: ${error.message}`);
  return data.id as string;
}

export async function crearResponsable(input: {
  organizacionId: string;
  nombre: string;
  apellido: string;
}): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from('responsables')
    .insert({
      nombre: input.nombre,
      apellido: input.apellido,
      organizacion_id: input.organizacionId,
      activo: true,
      es_externo: false,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Error al crear responsable: ${error.message}`);
  return data.id as string;
}
