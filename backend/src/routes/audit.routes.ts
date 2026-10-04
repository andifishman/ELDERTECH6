import { Router } from 'express';
import * as controller from '../controllers/audit.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const auditRouter = Router();

auditRouter.use(requireAuth, requireAdmin);

auditRouter.get('/', requirePermission('auditoria', 'ver'), asyncHandler(controller.getAuditoria));
