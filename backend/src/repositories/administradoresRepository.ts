import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export type RolUsuarioDB = 'residente' | 'admin' | 'staff';

export interface PerfilAdmin {
  id: string;
  username: string;
  rol: RolUsuarioDB;
  activo: boolean;
  created_at: string;
}

export async function listarPerfiles(): Promise<PerfilAdmin[]> {
  logger.info('repo:call', { repository: 'administradoresRepository', action: 'listarPerfiles' });
  try {
  const { data, error } = await getSupabaseAdmin().from('perfiles_usuario').select('id, username, rol, activo, created_at').order('username', { ascending: true });
  if (error) throw new Error(`Error al cargar administradores: ${error.message}`);
  return (data ?? []) as PerfilAdmin[];

  } catch (err) {
    logger.error('repo:error', { repository: 'administradoresRepository', action: 'listarPerfiles', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function actualizarRol(id: string, rol: RolUsuarioDB): Promise<void> {
  logger.info('repo:call', { repository: 'administradoresRepository', action: 'actualizarRol', id, rol });
  try {
  const { error } = await getSupabaseAdmin().from('perfiles_usuario').update({ rol }).eq('id', id);
  if (error) throw new Error(`Error al cambiar el rol: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'administradoresRepository', action: 'actualizarRol', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
