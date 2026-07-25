import { getSupabaseAdmin } from './supabaseAdmin';

export type RolUsuarioDB = 'residente' | 'admin' | 'staff';

export interface PerfilAdmin {
  id: string;
  username: string;
  rol: RolUsuarioDB;
  activo: boolean;
  created_at: string;
}

export async function listarPerfiles(): Promise<PerfilAdmin[]> {
  const { data, error } = await getSupabaseAdmin().from('perfiles_usuario').select('id, username, rol, activo, created_at').order('username', { ascending: true });
  if (error) throw new Error(`Error al cargar administradores: ${error.message}`);
  return (data ?? []) as PerfilAdmin[];
}

export async function actualizarRol(id: string, rol: RolUsuarioDB): Promise<void> {
  const { error } = await getSupabaseAdmin().from('perfiles_usuario').update({ rol }).eq('id', id);
  if (error) throw new Error(`Error al cambiar el rol: ${error.message}`);
}
