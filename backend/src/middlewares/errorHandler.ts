import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logging/logger';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', details: err.flatten() });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  logger.error('Error no manejado', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({ error: 'Error interno del servidor' });
}
