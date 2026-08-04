import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/deviceTokensRepository';
import { StatusCodes } from 'http-status-codes';

export async function registrar(user: AuthUser, expoPushToken: string, plataforma: 'ios' | 'android' | 'web', dispositivo: string | null): Promise<void> {
  if (!user.residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene un residente asociado.');
  await repo.registrarToken({
    perfilUsuarioId: user.supabaseUserId,
    residenteId: user.residenteId,
    organizacionId: user.organizacionId,
    expoPushToken,
    plataforma,
    dispositivo,
  });
}

/** Tokens activos de una tanda de residentes — usado por NotificationsAdminService al armar el fanout de un envío. */
export async function findTokensActivosPorResidentes(residenteIds: string[]) {
  return repo.findTokensActivosPorResidentes(residenteIds);
}
