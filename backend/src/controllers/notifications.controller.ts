import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as deviceTokensService from '../services/notifications/DeviceTokensService';
import * as notificationsAdminService from '../services/notifications/NotificationsAdminService';
import { marcarAbiertoSchema, registrarTokenSchema } from '../validators/notifications.validators';
import { requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env';

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

/** Clave pública VAPID para que el navegador se suscriba a Web Push. La privada nunca sale del backend. */
export async function getWebPushKey(_req: Request, res: Response): Promise<void> {
  if (!env.vapidPublicKey) throw new HttpError(StatusCodes.SERVICE_UNAVAILABLE, 'Las notificaciones web no están configuradas en el servidor.');
  res.json({ publicKey: env.vapidPublicKey });
}
