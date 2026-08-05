import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';

/** Exige que el `AuthUser` ya autenticado tenga residente y organización asociados, o corta con 403. */
export function requireResidenteContext(user: AuthUser): { residenteId: string; organizacionId: string } {
  if (!user.residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene un residente asociado.');
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return { residenteId: user.residenteId, organizacionId: user.organizacionId };
}
