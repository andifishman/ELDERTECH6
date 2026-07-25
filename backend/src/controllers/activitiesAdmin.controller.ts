import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as activitiesAdminService from '../services/activities/ActivitiesAdminService';
import {
  actividadAdminInputSchema,
  eliminarQuerySchema,
  listarActividadesQuerySchema,
  setActivoSchema,
} from '../validators/activitiesAdmin.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Falta el parámetro ${name}.`);
  return value;
}

export async function getActividades(req: Request, res: Response): Promise<void> {
  const { fecha } = listarActividadesQuerySchema.parse(req.query);
  res.json(await activitiesAdminService.listar(requireUser(req), fecha));
}

export async function getActividadPorId(req: Request, res: Response): Promise<void> {
  res.json(await activitiesAdminService.obtenerPorId(requireParam(req, 'id')));
}

export async function postActividad(req: Request, res: Response): Promise<void> {
  const input = actividadAdminInputSchema.parse(req.body);
  const id = await activitiesAdminService.crear(requireUser(req), input);
  res.status(201).json({ id });
}

export async function patchActividad(req: Request, res: Response): Promise<void> {
  const input = actividadAdminInputSchema.parse(req.body);
  await activitiesAdminService.actualizar(requireUser(req), requireParam(req, 'id'), input);
  res.status(204).end();
}

export async function patchActivo(req: Request, res: Response): Promise<void> {
  const { activo, nombre } = setActivoSchema.parse(req.body);
  await activitiesAdminService.setActivo(requireUser(req), requireParam(req, 'id'), activo, nombre);
  res.status(204).end();
}

export async function deleteActividad(req: Request, res: Response): Promise<void> {
  const { nombre } = eliminarQuerySchema.parse(req.query);
  await activitiesAdminService.eliminar(requireUser(req), requireParam(req, 'id'), nombre);
  res.status(204).end();
}
