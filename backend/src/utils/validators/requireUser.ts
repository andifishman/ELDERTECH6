import type { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';

/** Exige que `requireAuth` ya haya poblado `req.user`, o corta con 401. */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw new HttpError(StatusCodes.UNAUTHORIZED, 'No autenticado.');
  return req.user;
}
