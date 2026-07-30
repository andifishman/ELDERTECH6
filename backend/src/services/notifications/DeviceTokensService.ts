import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/deviceTokensRepository';

export async function registrar(user: AuthUser, expoPushToken: string, plataforma: 'ios' | 'android' | 'web', dispositivo: string | null): Promise<void> {
  if (!user.residenteId) throw new HttpError(403, 'Este usuario no tiene un residente asociado.');
  await repo.registrarToken({
    perfilUsuarioId: user.supabaseUserId,
    residenteId: user.residenteId,
    organizacionId: user.organizacionId,
    expoPushToken,
    plataforma,
    dispositivo,
  });
}
