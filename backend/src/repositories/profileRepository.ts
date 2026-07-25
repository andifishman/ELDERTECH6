import { getSupabaseAdmin } from './supabaseAdmin';

export interface ActualizarPerfilInput {
  nombre_completo?: string;
  avatar_url?: string;
}

export async function actualizarPerfil(userId: string, input: ActualizarPerfilInput): Promise<void> {
  const { error } = await getSupabaseAdmin().from('perfiles_usuario').update(input).eq('id', userId);
  if (error) throw new Error(`Error al actualizar el perfil: ${error.message}`);
}

/** Sube al bucket `tutorial-images` (mismo bucket que usa el resto del backoffice para imágenes). */
export async function subirAvatar(userId: string, buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'jpg';
  const path = `avatars/${userId}-${Date.now()}.${ext}`;

  const { error } = await getSupabaseAdmin().storage.from('tutorial-images').upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Error al subir la foto: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('tutorial-images').getPublicUrl(path);
  return data.publicUrl;
}
