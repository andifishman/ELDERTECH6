import type { Request, Response } from 'express';
import * as repo from '../repositories/organizacionesRepository';
import { feedAplicaA } from '../config/feedHorarios';
import * as service from '../services/organizaciones/OrganizacionesService';
import { actualizarOrganizacionSchema } from '../validators/organizaciones.validators';
import { requireUser, requireUuidParam } from '../utils/validators';

/**
 * Instituciones que el usuario del backoffice puede operar y cuál está activa ahora. Un super admin ve todas (y puede
 * cambiar con el header `X-Organizacion-Id`); cualquier otra cuenta ve solo la suya.
 */
export async function getOrganizaciones(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const todas = await repo.listarActivas();
  const instituciones = user.isSuperAdmin ? todas : todas.filter((o) => o.id === user.organizacionId);
  res.json({
    actualId: user.organizacionId,
    colorPrincipal: todas.find((o) => o.id === user.organizacionId)?.colorPrincipal ?? null,
    puedeCambiar: user.isSuperAdmin && instituciones.length > 1,
    // La grilla "Horarios del Hogar" es de una sola institución: las demás cargan y editan sus propias actividades.
    usaFeedHogar: feedAplicaA(user.organizacionId),
    instituciones,
  });
}

/** Super admin: todas las instituciones con sus datos y su color (pantalla Instituciones del backoffice). */
export async function getGestion(_req: Request, res: Response): Promise<void> {
  res.json(await service.listarParaGestion());
}

/** Super admin: edita los datos y el color principal de una institución. */
export async function patchOrganizacion(req: Request, res: Response): Promise<void> {
  const cambios = actualizarOrganizacionSchema.parse(req.body);
  res.json(await service.actualizar(requireUser(req), requireUuidParam(req, 'id'), cambios));
}
