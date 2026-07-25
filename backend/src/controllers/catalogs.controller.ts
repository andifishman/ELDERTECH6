import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as catalogsService from '../services/catalogs/CatalogsService';
import { crearResponsableSchema, crearTipoActividadSchema, crearUbicacionSchema } from '../validators/catalogs.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

export async function getCatalogos(req: Request, res: Response): Promise<void> {
  res.json(await catalogsService.obtenerCatalogos(requireUser(req)));
}

export async function postTipoActividad(req: Request, res: Response): Promise<void> {
  const payload = crearTipoActividadSchema.parse(req.body);
  const id = await catalogsService.crearTipoActividad(requireUser(req), payload);
  res.status(201).json({ id });
}

export async function postUbicacion(req: Request, res: Response): Promise<void> {
  const { nombre } = crearUbicacionSchema.parse(req.body);
  const id = await catalogsService.crearUbicacion(requireUser(req), nombre);
  res.status(201).json({ id });
}

export async function postResponsable(req: Request, res: Response): Promise<void> {
  const { nombreCompleto } = crearResponsableSchema.parse(req.body);
  const id = await catalogsService.crearResponsable(requireUser(req), nombreCompleto);
  res.status(201).json({ id });
}
