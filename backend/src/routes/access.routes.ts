import { Router } from 'express';
import * as controller from '../controllers/access.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requireSuperAdminOInstitucion } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const accessRouter = Router();

accessRouter.use(requireAuth, requireAdmin);

// Cualquier usuario del backoffice puede consultar SUS propios permisos (para armar su menú).
accessRouter.get('/me', asyncHandler(controller.getMisPermisos));

// Administrar los accesos de los demás: Super Super Admin (todas las instituciones) o super admin de institución (solo la suya). Nunca delegable a un admin común.
accessRouter.get('/modulos', requireSuperAdminOInstitucion, asyncHandler(controller.getModulos));
accessRouter.get('/usuarios', requireSuperAdminOInstitucion, asyncHandler(controller.getUsuarios));
accessRouter.put('/usuarios/:id', requireSuperAdminOInstitucion, asyncHandler(controller.putPermisos));
