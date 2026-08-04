import type { Request, Response } from 'express';
import * as activitiesAdminService from '../services/activities/ActivitiesAdminService';
import {
  actividadAdminInputSchema,
  eliminarQuerySchema,
  listarActividadesQuerySchema,
  setActivoSchema,
} from '../validators/activitiesAdmin.validators';
import { requireParam, requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

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
  res.status(StatusCodes.CREATED).json({ id });
}

export async function patchActividad(req: Request, res: Response): Promise<void> {
  const input = actividadAdminInputSchema.parse(req.body);
  await activitiesAdminService.actualizar(requireUser(req), requireParam(req, 'id'), input);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function patchActivo(req: Request, res: Response): Promise<void> {
  const { activo, nombre } = setActivoSchema.parse(req.body);
  await activitiesAdminService.setActivo(requireUser(req), requireParam(req, 'id'), activo, nombre);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function deleteActividad(req: Request, res: Response): Promise<void> {
  const { nombre } = eliminarQuerySchema.parse(req.query);
  await activitiesAdminService.eliminar(requireUser(req), requireParam(req, 'id'), nombre);
  res.status(StatusCodes.NO_CONTENT).end();
}
