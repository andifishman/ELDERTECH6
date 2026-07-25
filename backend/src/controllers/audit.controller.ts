import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as auditService from '../services/audit/AuditService';
import { listarAuditoriaQuerySchema } from '../validators/audit.validators';

export async function getAuditoria(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  const { limit } = listarAuditoriaQuerySchema.parse(req.query);
  res.json(await auditService.listar(req.user, limit));
}
