import type { Request, Response } from 'express';
import * as processor from '../services/notifications/NotificationsProcessorService';
import { logger } from '../logging/logger';

export async function postProcesar(_req: Request, res: Response): Promise<void> {
  const resultado = await processor.procesarTodo();
  logger.info('[notificaciones] cron ejecutado', resultado);
  res.json({ ok: true, ...resultado });
}
