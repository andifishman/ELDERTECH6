import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 4 no reenvía rechazos de promesas al error handler — este wrapper lo hace. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
