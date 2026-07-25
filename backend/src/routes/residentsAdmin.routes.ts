import { Router } from 'express';
import * as controller from '../controllers/residentsAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const residentsAdminRouter = Router();

residentsAdminRouter.use(requireAuth, requireAdmin);

residentsAdminRouter.get('/', asyncHandler(controller.getResidentes));
residentsAdminRouter.post('/', asyncHandler(controller.postUsuario));
residentsAdminRouter.get('/:id', asyncHandler(controller.getDetalle));
residentsAdminRouter.patch('/:id', asyncHandler(controller.patchResidente));
residentsAdminRouter.patch('/:id/active', asyncHandler(controller.patchActivo));
residentsAdminRouter.post('/:id/reset-password', asyncHandler(controller.postResetPassword));
