import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as deviceTokensService from '../services/notifications/DeviceTokensService';
import * as notificationsAdminService from '../services/notifications/NotificationsAdminService';
import { marcarAbiertoSchema, registrarTokenSchema } from '../validators/notifications.validators';
import { requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function postRegistrarToken(req: Request, res: Response): Promise<void> {
  const { expoPushToken, plataforma, dispositivo } = registrarTokenSchema.parse(req.body);
  await deviceTokensService.registrar(requireUser(req), expoPushToken, plataforma, dispositivo ?? null);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function postMarcarAbierto(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { notificationId } = marcarAbiertoSchema.parse(req.body);
  if (!user.residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene un residente asociado.');
  await notificationsAdminService.marcarAbierto(notificationId, user.residenteId);
  res.status(StatusCodes.NO_CONTENT).end();
}
