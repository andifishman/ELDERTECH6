import { Router } from 'express';
import * as controller from '../controllers/organizaciones.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requireSuperAdmin } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const organizacionesAdminRouter = Router();
organizacionesAdminRouter.use(requireAuth, requireAdmin);
organizacionesAdminRouter.get('/', asyncHandler(controller.getOrganizaciones));
// Gestión de instituciones: solo el super admin (nunca se delega con permisos por módulo)
organizacionesAdminRouter.get('/gestion', requireSuperAdmin, asyncHandler(controller.getGestion));
organizacionesAdminRouter.patch('/:id', requireSuperAdmin, asyncHandler(controller.patchOrganizacion));
