import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export interface ActualizarPerfilInput {
  nombre_completo?: string;
  avatar_url?: string;
}

export async function actualizarPerfil(userId: string, input: ActualizarPerfilInput): Promise<void> {
  logger.info('repo:call', { repository: 'profileRepository', action: 'actualizarPerfil', userId, input });
  try {
  const { error } = await getSupabaseAdmin().from('perfiles_usuario').update(input).eq('id', userId);
  if (error) throw new Error(`Error al actualizar el perfil: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'profileRepository', action: 'actualizarPerfil', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Sube al bucket `tutorial-images` (mismo bucket que usa el resto del backoffice para imágenes). */
export async function subirAvatar(userId: string, buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  logger.info('repo:call', { repository: 'profileRepository', action: 'subirAvatar', userId, buffer, contentType, originalName });
  try {
  const ext = originalName.split('.').pop() ?? 'jpg';
  const path = `avatars/${userId}-${Date.now()}.${ext}`;

  const { error } = await getSupabaseAdmin().storage.from('tutorial-images').upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Error al subir la foto: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('tutorial-images').getPublicUrl(path);
  return data.publicUrl;

  } catch (err) {
    logger.error('repo:error', { repository: 'profileRepository', action: 'subirAvatar', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
