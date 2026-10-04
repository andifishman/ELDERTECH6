import { Router } from 'express';
import * as controller from '../controllers/residentsAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const residentsAdminRouter = Router();

residentsAdminRouter.use(requireAuth, requireAdmin);

residentsAdminRouter.get('/', requirePermission('usuarios', 'ver'), asyncHandler(controller.getResidentes));
residentsAdminRouter.post('/', requirePermission('usuarios', 'crear'), asyncHandler(controller.postUsuario));
residentsAdminRouter.get('/:id', requirePermission('usuarios', 'ver'), asyncHandler(controller.getDetalle));
residentsAdminRouter.patch('/:id', requirePermission('usuarios', 'editar'), asyncHandler(controller.patchResidente));
residentsAdminRouter.patch('/:id/active', requirePermission('usuarios', 'editar'), asyncHandler(controller.patchActivo));
residentsAdminRouter.post('/:id/reset-password', requirePermission('usuarios', 'editar'), asyncHandler(controller.postResetPassword));
