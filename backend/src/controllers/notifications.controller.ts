import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as deviceTokensService from '../services/notifications/DeviceTokensService';
import * as notificationsRepo from '../repositories/notificationsRepository';
import { marcarAbiertoSchema, registrarTokenSchema } from '../validators/notifications.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

export async function postRegistrarToken(req: Request, res: Response): Promise<void> {
  const { expoPushToken, plataforma, dispositivo } = registrarTokenSchema.parse(req.body);
  await deviceTokensService.registrar(requireUser(req), expoPushToken, plataforma, dispositivo ?? null);
  res.status(204).end();
}

export async function postMarcarAbierto(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { notificationId } = marcarAbiertoSchema.parse(req.body);
  if (!user.residenteId) throw new HttpError(403, 'Este usuario no tiene un residente asociado.');
  await notificationsRepo.marcarAbierto(notificationId, user.residenteId);
  res.status(204).end();
}
