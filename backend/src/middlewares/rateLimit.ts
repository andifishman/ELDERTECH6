import type { NextFunction, Request, Response } from 'express';
import { getCacheStore } from '../cache';

export interface RateLimitOptions {
  /** Requests permitidos por ventana. */
  limit: number;
  windowSeconds: number;
}

/**
 * Rate limit inbound (protección contra abuso de nuestra propia API — no
 * confundir con el rate-limit de PROVIDERS externos, eso lo maneja
 * `RateLimitDetector` dentro del framework de providers). Ventana fija por
 * IP + usuario autenticado (si lo hay) + ruta.
 */
export function rateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const cache = getCacheStore();
    const identity = req.user?.supabaseUserId ?? req.ip ?? 'anon';
    const key = `ratelimit:${req.baseUrl}${req.path}:${identity}`;

    const count = await cache.increment(key, options.windowSeconds);
    if (count > options.limit) {
      res.status(429).json({ error: 'Demasiadas solicitudes. Probá de nuevo en un momento.' });
      return;
    }
    next();
  };
}
