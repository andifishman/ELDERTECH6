import { Router } from 'express';
import * as controller from '../controllers/audit.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const auditRouter = Router();

auditRouter.use(requireAuth, requireAdmin);

auditRouter.get('/', asyncHandler(controller.getAuditoria));
