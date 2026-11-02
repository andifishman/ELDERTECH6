import { requireResidenteContext } from '../../utils/validators';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/deviceTokensRepository';
import * as residentsRepo from '../../repositories/residentsRepository';

export async function registrar(user: AuthUser, expoPushToken: string, plataforma: 'ios' | 'android' | 'web', dispositivo: string | null): Promise<void> {
  const { residenteId, organizacionId } = requireResidenteContext(user);
  await repo.registrarToken({
    perfilUsuarioId: user.supabaseUserId,
    residenteId,
    organizacionId,
    expoPushToken,
    plataforma,
    dispositivo,
  });
  // Cada registro de token es, de paso, una confirmación real de con qué
  // dispositivo entra el residente — así el tipo de celular se detecta solo,
  // sin que el staff tenga que elegirlo al crear el usuario.
  void residentsRepo.actualizarTipoCelularDetectado(residenteId, plataforma);
}

/** Tokens activos de una tanda de residentes — usado por NotificationsAdminService al armar el fanout de un envío. */
export async function findTokensActivosPorResidentes(residenteIds: string[]) {
  return repo.findTokensActivosPorResidentes(residenteIds);
}
