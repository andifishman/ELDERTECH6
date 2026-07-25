import { Router } from 'express';
import * as controller from '../controllers/activitiesAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const activitiesAdminRouter = Router();

activitiesAdminRouter.use(requireAuth, requireAdmin);

activitiesAdminRouter.get('/', asyncHandler(controller.getActividades));
activitiesAdminRouter.get('/:id', asyncHandler(controller.getActividadPorId));
activitiesAdminRouter.post('/', asyncHandler(controller.postActividad));
activitiesAdminRouter.patch('/:id', asyncHandler(controller.patchActividad));
activitiesAdminRouter.patch('/:id/active', asyncHandler(controller.patchActivo));
activitiesAdminRouter.delete('/:id', asyncHandler(controller.deleteActividad));
