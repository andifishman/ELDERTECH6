import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/jardinNivelesRepository';
import { StatusCodes } from 'http-status-codes';

export const TOTAL_NIVELES_JARDIN = 30;

export type { ProgresoNivel } from '../../repositories/jardinNivelesRepository';

export async function obtenerProgreso(user: AuthUser): Promise<repo.ProgresoNivel[]> {
  if (!user.residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene un residente asociado.');
  return repo.obtenerProgreso(user.residenteId);
}

/**
 * Guarda el resultado de un nivel completado. Valida que el nivel esté
 * desbloqueado (el 1 siempre lo está; el resto exige que el anterior tenga
 * al menos 1 estrella) y solo actualiza el progreso guardado si el intento
 * nuevo es mejor que el anterior (más estrellas, o mismas estrellas con
 * menos movimientos) — así el backoffice y el mapa de niveles siempre
 * reflejan el mejor intento del residente, no el último.
 */
export async function completarNivel(
  user: AuthUser,
  nivel: number,
  estrellas: number,
  movimientosUsados: number,
): Promise<repo.ProgresoNivel> {
  if (!user.residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene un residente asociado.');
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');

  if (nivel > 1) {
    const anterior = await repo.obtenerProgresoNivel(user.residenteId, nivel - 1);
    if (!anterior) {
      throw new HttpError(StatusCodes.FORBIDDEN, `El nivel ${nivel} todavía está bloqueado: hay que completar el nivel ${nivel - 1} primero.`);
    }
  }

  const actual = await repo.obtenerProgresoNivel(user.residenteId, nivel);
  const esMejorIntento =
    !actual || estrellas > actual.estrellas || (estrellas === actual.estrellas && movimientosUsados < actual.movimientosUsados);

  if (esMejorIntento) {
    await repo.guardarProgresoNivel(user.residenteId, user.organizacionId, nivel, estrellas, movimientosUsados);
    return { nivel, estrellas, movimientosUsados };
  }
  return actual;
}
