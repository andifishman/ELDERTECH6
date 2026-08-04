import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

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
  logger.info('repo:call', { repository: 'catalogsRepository', action: 'findTiposActividad', organizacionId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('tipos_actividad')
    .select('*')
    .or(`organizacion_id.is.null,organizacion_id.eq.${organizacionId}`)
    .eq('activo', true)
    .order('nombre');
  if (error) throw new Error(`Error al cargar tipos de actividad: ${error.message}`);
  return (data ?? []) as TipoActividad[];

  } catch (err) {
    logger.error('repo:error', { repository: 'catalogsRepository', action: 'findTiposActividad', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function findUbicaciones(organizacionId: string): Promise<Ubicacion[]> {
  logger.info('repo:call', { repository: 'catalogsRepository', action: 'findUbicaciones', organizacionId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('ubicaciones')
    .select('*')
    .eq('organizacion_id', organizacionId)
    .eq('activo', true)
    .order('nombre');
  if (error) throw new Error(`Error al cargar ubicaciones: ${error.message}`);
  return (data ?? []) as Ubicacion[];

  } catch (err) {
    logger.error('repo:error', { repository: 'catalogsRepository', action: 'findUbicaciones', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface Interes {
  id: string;
  nombre: string;
  emoji: string | null;
  activo: boolean;
}

/** Catálogo global de intereses — usado por el módulo Notificaciones para targeting "por intereses". */
export async function findIntereses(): Promise<Interes[]> {
  logger.info('repo:call', { repository: 'catalogsRepository', action: 'findIntereses' });
  try {
  const { data, error } = await getSupabaseAdmin().from('intereses').select('id, nombre, emoji, activo').eq('activo', true).order('nombre');
  if (error) throw new Error(`Error al cargar intereses: ${error.message}`);
  return (data ?? []) as Interes[];

  } catch (err) {
    logger.error('repo:error', { repository: 'catalogsRepository', action: 'findIntereses', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function findResponsables(organizacionId: string): Promise<Responsable[]> {
  logger.info('repo:call', { repository: 'catalogsRepository', action: 'findResponsables', organizacionId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('responsables')
    .select('*')
    .or(`organizacion_id.is.null,organizacion_id.eq.${organizacionId}`)
    .eq('activo', true)
    .order('nombre');
  if (error) throw new Error(`Error al cargar responsables: ${error.message}`);
  return (data ?? []) as Responsable[];

  } catch (err) {
    logger.error('repo:error', { repository: 'catalogsRepository', action: 'findResponsables', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function crearTipoActividad(input: {
  organizacionId: string;
  nombre: string;
  emoji: string | null;
  horaInicioDefault: string | null;
  horaFinDefault: string | null;
}): Promise<string> {
  logger.info('repo:call', { repository: 'catalogsRepository', action: 'crearTipoActividad', input });
  try {
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

  } catch (err) {
    logger.error('repo:error', { repository: 'catalogsRepository', action: 'crearTipoActividad', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function crearUbicacion(input: { organizacionId: string; nombre: string }): Promise<string> {
  logger.info('repo:call', { repository: 'catalogsRepository', action: 'crearUbicacion', input });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('ubicaciones')
    .insert({ nombre: input.nombre, organizacion_id: input.organizacionId, activo: true })
    .select('id')
    .single();
  if (error) throw new Error(`Error al crear ubicación: ${error.message}`);
  return data.id as string;

  } catch (err) {
    logger.error('repo:error', { repository: 'catalogsRepository', action: 'crearUbicacion', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function crearResponsable(input: {
  organizacionId: string;
  nombre: string;
  apellido: string;
}): Promise<string> {
  logger.info('repo:call', { repository: 'catalogsRepository', action: 'crearResponsable', input });
  try {
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

  } catch (err) {
    logger.error('repo:error', { repository: 'catalogsRepository', action: 'crearResponsable', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
