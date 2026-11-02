import type { Request, Response } from 'express';
import * as activitiesService from '../services/activities/ActivitiesService';
import { getActivitiesQuerySchema } from '../validators/activities.validators';
import { requireResidenteId, requireUuidParam } from '../utils/validators';

export async function getActivities(req: Request, res: Response): Promise<void> {
  const { fecha } = getActivitiesQuerySchema.parse(req.query);
  const residenteId = requireResidenteId(req);
  const fechaObj = fecha ? new Date(`${fecha}T00:00:00`) : new Date();

  res.json(await activitiesService.getActividadesPersonalizadas(residenteId, fechaObj));
}

export async function getActivityById(req: Request, res: Response): Promise<void> {
  const id = requireUuidParam(req, 'id');
  res.json(await activitiesService.getActividadById(id));
}
