import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as activitiesService from '../services/activities/ActivitiesService';
import { getActivitiesQuerySchema } from '../validators/activities.validators';

function requireResidenteId(req: Request): string {
  const residenteId = req.user?.residenteId;
  if (!residenteId) throw new HttpError(403, 'Este usuario no tiene un residente asociado.');
  return residenteId;
}

export async function getActivities(req: Request, res: Response): Promise<void> {
  const { fecha } = getActivitiesQuerySchema.parse(req.query);
  const residenteId = requireResidenteId(req);
  const fechaObj = fecha ? new Date(`${fecha}T00:00:00`) : new Date();

  res.json(await activitiesService.getActividadesPersonalizadas(residenteId, fechaObj));
}

export async function getActivityById(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  if (!id) throw new HttpError(400, 'Falta el id de la actividad.');
  res.json(await activitiesService.getActividadById(id));
}
