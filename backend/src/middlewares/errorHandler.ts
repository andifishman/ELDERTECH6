import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logging/logger';
import { StatusCodes } from 'http-status-codes';

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
  res.status(StatusCodes.NOT_FOUND).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: 'Datos inválidos', details: err.flatten() });
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
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Error interno del servidor' });
}
