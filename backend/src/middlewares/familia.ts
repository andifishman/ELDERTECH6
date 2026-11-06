import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../logging/logger';
import { HttpError } from './errorHandler';
import * as familiaRepo from '../repositories/familiaRepository';
import type { FamiliarContext } from '../utils/familia';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      familiar?: FamiliarContext;
    }
  }
}

/**
 * Para rutas /api/familia/* — va DESPUÉS de `requireAuth`. Deja en `req.familiar` quién es el familiar y la
 * lista de residentes a los que está vinculado AHORA (se lee de la base en cada request, sin caché, así que
 * revocar un vínculo o deshabilitar al familiar rige de inmediato).
 *
 * Solo entra una cuenta con rol `familiar`, activa, con ficha en `familiares` de su misma institución.
 * Un residente, un admin o un super admin NO pasan por acá: esta app no es suya.
 */
export async function requireFamiliar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.rol !== 'familiar' || !user.activo || !user.organizacionId) {
      res.status(StatusCodes.FORBIDDEN).json({ error: 'Esta cuenta no tiene acceso a la app de familiares.' });
      return;
    }

    const familiar = await familiaRepo.obtenerFamiliar(user.supabaseUserId);
    if (!familiar || !familiar.activo || familiar.organizacion_id !== user.organizacionId) {
      logger.warn('requireFamiliar: cuenta sin ficha de familiar activa', { userId: user.supabaseUserId });
      res.status(StatusCodes.FORBIDDEN).json({ error: 'Esta cuenta no tiene acceso a la app de familiares.' });
      return;
    }

    const vinculos = await familiaRepo.listarVinculosActivos(familiar.id);
    req.familiar = {
      familiarId: familiar.id,
      organizacionId: familiar.organizacion_id,
      nombre: familiar.nombre,
      apellido: familiar.apellido,
      email: familiar.email,
      vinculos: vinculos.flatMap((v) =>
        v.residente
          ? [{ vinculoId: v.id, residenteId: v.residente_id, parentesco: v.parentesco, nombre: v.residente.nombre, apellido: v.residente.apellido, seccion: v.residente.seccion }]
          : [],
      ),
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** Saca el contexto del familiar de la request, o corta con 403 si `requireFamiliar` no corrió. */
export function requireFamiliarContext(req: Request): FamiliarContext {
  if (!req.familiar) throw new HttpError(StatusCodes.FORBIDDEN, 'Esta cuenta no tiene acceso a la app de familiares.');
  return req.familiar;
}
