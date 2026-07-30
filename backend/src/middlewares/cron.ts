import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

/**
 * Protege los endpoints que solo debería llamar Vercel Cron. Vercel inyecta
 * `Authorization: Bearer <CRON_SECRET>` automáticamente en sus propias
 * invocaciones cuando la env var se llama exactamente `CRON_SECRET` — no es
 * un mecanismo custom, así que no hace falta configurar nada en vercel.json
 * más allá de declarar el cron job.
 */
export function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  if (!env.cronSecret) {
    res.status(500).json({ error: 'CRON_SECRET no configurado en el servidor.' });
    return;
  }
  const header = req.headers.authorization;
  if (header !== `Bearer ${env.cronSecret}`) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }
  next();
}
