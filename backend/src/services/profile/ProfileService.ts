import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/profileRepository';

export async function actualizar(user: AuthUser, input: repo.ActualizarPerfilInput): Promise<void> {
  await repo.actualizarPerfil(user.supabaseUserId, input);
}

export async function subirAvatar(user: AuthUser, buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  return repo.subirAvatar(user.supabaseUserId, buffer, contentType, originalName);
}
