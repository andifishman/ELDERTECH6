import type { Request, Response } from 'express';
import * as catalogsService from '../services/catalogs/CatalogsService';
import { crearResponsableSchema, crearTipoActividadSchema, crearUbicacionSchema } from '../validators/catalogs.validators';
import { requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function getCatalogos(req: Request, res: Response): Promise<void> {
  res.json(await catalogsService.obtenerCatalogos(requireUser(req)));
}

export async function postTipoActividad(req: Request, res: Response): Promise<void> {
  const payload = crearTipoActividadSchema.parse(req.body);
  const id = await catalogsService.crearTipoActividad(requireUser(req), payload);
  res.status(StatusCodes.CREATED).json({ id });
}

export async function postUbicacion(req: Request, res: Response): Promise<void> {
  const { nombre } = crearUbicacionSchema.parse(req.body);
  const id = await catalogsService.crearUbicacion(requireUser(req), nombre);
  res.status(StatusCodes.CREATED).json({ id });
}

export async function postResponsable(req: Request, res: Response): Promise<void> {
  const { nombreCompleto } = crearResponsableSchema.parse(req.body);
  const id = await catalogsService.crearResponsable(requireUser(req), nombreCompleto);
  res.status(StatusCodes.CREATED).json({ id });
}
