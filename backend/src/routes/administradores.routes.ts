import { Router } from 'express';
import * as controller from '../controllers/administradores.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const administradoresRouter = Router();

// requireAdmin es un primer filtro grueso (admin/staff) — el chequeo real de
// super-admin (por email) vive en AdministradoresService.
administradoresRouter.use(requireAuth, requireAdmin);

administradoresRouter.get('/', asyncHandler(controller.getAdministradores));
administradoresRouter.patch('/:id/role', asyncHandler(controller.patchRol));
