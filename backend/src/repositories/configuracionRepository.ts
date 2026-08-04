import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export interface Organizacion {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string;
  timezone: string;
  logo_url?: string | null;
  activo: boolean;
  created_at: string;
}

export async function obtenerOrganizacion(organizacionId: string): Promise<Organizacion | null> {
  logger.info('repo:call', { repository: 'configuracionRepository', action: 'obtenerOrganizacion', organizacionId });
  try {
  const { data, error } = await getSupabaseAdmin().from('organizaciones').select('*').eq('id', organizacionId).maybeSingle();
  if (error) throw new Error(`Error al cargar la organización: ${error.message}`);
  return (data as Organizacion) ?? null;

  } catch (err) {
    logger.error('repo:error', { repository: 'configuracionRepository', action: 'obtenerOrganizacion', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface ActualizarOrganizacionInput {
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
}

export async function actualizarOrganizacion(organizacionId: string, input: ActualizarOrganizacionInput): Promise<void> {
  logger.info('repo:call', { repository: 'configuracionRepository', action: 'actualizarOrganizacion', organizacionId, input });
  try {
  const { error } = await getSupabaseAdmin()
    .from('organizaciones')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', organizacionId);
  if (error) throw new Error(`Error al guardar la configuración: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'configuracionRepository', action: 'actualizarOrganizacion', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
