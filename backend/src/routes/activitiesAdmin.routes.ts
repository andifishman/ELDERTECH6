import { Router } from 'express';
import * as controller from '../controllers/activitiesAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const activitiesAdminRouter = Router();

activitiesAdminRouter.use(requireAuth, requireAdmin);

activitiesAdminRouter.get('/', requirePermission('horarios', 'ver'), asyncHandler(controller.getActividades));
activitiesAdminRouter.get('/:id', requirePermission('horarios', 'ver'), asyncHandler(controller.getActividadPorId));
activitiesAdminRouter.post('/', requirePermission('horarios', 'crear'), asyncHandler(controller.postActividad));
activitiesAdminRouter.patch('/:id', requirePermission('horarios', 'editar'), asyncHandler(controller.patchActividad));
activitiesAdminRouter.patch('/:id/active', requirePermission('horarios', 'editar'), asyncHandler(controller.patchActivo));
activitiesAdminRouter.delete('/:id', requirePermission('horarios', 'eliminar'), asyncHandler(controller.deleteActividad));
