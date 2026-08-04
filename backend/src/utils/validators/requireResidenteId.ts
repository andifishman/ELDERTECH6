import type { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';

/** Exige que el usuario logueado tenga un residente asociado, o corta con 403. */
export function requireResidenteId(req: Request): string {
  const residenteId = req.user?.residenteId;
  if (!residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene un residente asociado.');
  return residenteId;
}
