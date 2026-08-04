import type { Request, Response } from 'express';
import * as auditService from '../services/audit/AuditService';
import { listarAuditoriaQuerySchema } from '../validators/audit.validators';
import { requireUser } from '../utils/validators';

export async function getAuditoria(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { limit } = listarAuditoriaQuerySchema.parse(req.query);
  res.json(await auditService.listar(user, limit));
}
