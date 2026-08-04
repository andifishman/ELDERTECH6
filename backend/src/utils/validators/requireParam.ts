import type { Request } from 'express';
import { HttpError } from '../../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';

/** Exige un `req.params[name]` no vacío o corta con 400. */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(StatusCodes.BAD_REQUEST, `Falta el parámetro ${name}.`);
  return value;
}
