import { Router } from 'express';
import * as controller from '../controllers/access.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requireSuperAdmin } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const accessRouter = Router();

accessRouter.use(requireAuth, requireAdmin);

// Cualquier usuario del backoffice puede consultar SUS propios permisos (para armar su menú).
accessRouter.get('/me', asyncHandler(controller.getMisPermisos));

// Administrar los accesos de los demás: exclusivo del Super Super Admin, nunca delegable.
accessRouter.get('/modulos', requireSuperAdmin, asyncHandler(controller.getModulos));
accessRouter.get('/usuarios', requireSuperAdmin, asyncHandler(controller.getUsuarios));
accessRouter.put('/usuarios/:id', requireSuperAdmin, asyncHandler(controller.putPermisos));
