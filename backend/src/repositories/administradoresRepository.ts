import { getSupabaseAdmin } from './supabaseAdmin';
import { withRepoLogging } from '../logging/repoLogger';

export type RolUsuarioDB = 'residente' | 'admin' | 'staff';

export interface PerfilAdmin {
  id: string;
  username: string;
  rol: RolUsuarioDB;
  activo: boolean;
  created_at: string;
}

// Las cuentas de familiares (rol 'familiar') se gestionan solo desde Familiares: ni se listan acá ni se les puede cambiar el rol.
export const listarPerfiles = withRepoLogging('administradoresRepository', 'listarPerfiles', async (organizacionId?: string | null): Promise<PerfilAdmin[]> => {
  let consulta = getSupabaseAdmin().from('perfiles_usuario').select('id, username, rol, activo, created_at').neq('rol', 'familiar');
  if (organizacionId) consulta = consulta.eq('organizacion_id', organizacionId);
  const { data, error } = await consulta.order('username', { ascending: true });
  if (error) throw new Error(`Error al cargar administradores: ${error.message}`);
  return (data ?? []) as PerfilAdmin[];
});

export const actualizarRol = withRepoLogging('administradoresRepository', 'actualizarRol', async (id: string, rol: RolUsuarioDB, organizacionId?: string | null): Promise<boolean> => {
  let consulta = getSupabaseAdmin().from('perfiles_usuario').update({ rol }).eq('id', id).neq('rol', 'familiar');
  if (organizacionId) consulta = consulta.eq('organizacion_id', organizacionId);
  const { data, error } = await consulta.select('id');
  if (error) throw new Error(`Error al cambiar el rol: ${error.message}`);
  return (data ?? []).length > 0;
});
