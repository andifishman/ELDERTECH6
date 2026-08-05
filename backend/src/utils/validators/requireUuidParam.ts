import type { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import { requireParam } from './requireParam';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Como `requireParam`, pero además exige que el valor tenga formato UUID, o corta con 400. */
export function requireUuidParam(req: Request, name: string): string {
  const value = requireParam(req, name);
  if (!UUID_REGEX.test(value)) throw new HttpError(StatusCodes.BAD_REQUEST, `El parámetro ${name} debe ser un UUID válido.`);
  return value;
}
