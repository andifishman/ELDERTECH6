import type { Request, Response } from 'express';
import * as repo from '../repositories/novedadesRepository';
import { logger } from '../logging/logger';

/** Borra las novedades cuyo evento ya pasó: un evento del 26/9 se borra el 27/9. */
export async function postLimpiarVencidas(_req: Request, res: Response): Promise<void> {
  const eliminadas = await repo.eliminarVencidas(new Date());
  logger.info('[novedades] cron de vencidas ejecutado', { eliminadas: eliminadas.length, titulos: eliminadas });
  res.json({ ok: true, eliminadas: eliminadas.length });
}
