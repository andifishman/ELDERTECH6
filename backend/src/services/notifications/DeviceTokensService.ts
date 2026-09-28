import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/deviceTokensRepository';
import * as residentsRepo from '../../repositories/residentsRepository';
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
  // Cada registro de token es, de paso, una confirmación real de con qué
  // dispositivo entra el residente — así el tipo de celular se detecta solo,
  // sin que el staff tenga que elegirlo al crear el usuario.
  void residentsRepo.actualizarTipoCelularDetectado(user.residenteId, plataforma);
}

/** Tokens activos de una tanda de residentes — usado por NotificationsAdminService al armar el fanout de un envío. */
export async function findTokensActivosPorResidentes(residenteIds: string[]) {
  return repo.findTokensActivosPorResidentes(residenteIds);
}
