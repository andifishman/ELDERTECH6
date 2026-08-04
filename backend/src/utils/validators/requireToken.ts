import type { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';

/** Extrae el Bearer token crudo del header Authorization, o corta con 401. */
export function requireToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(StatusCodes.UNAUTHORIZED, 'No autenticado.');
  return header.slice('Bearer '.length);
}
