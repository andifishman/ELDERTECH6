import { Router } from 'express';
import * as controller from '../controllers/horariosExternos.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

/** App del residente: horarios del hogar (lectura). */
export const horariosExternosRouter = Router();
horariosExternosRouter.use(requireAuth);
horariosExternosRouter.get('/', asyncHandler(controller.getActividades));

/** Backoffice: ver lo que muestra la app y forzar una actualización. */
export const horariosExternosAdminRouter = Router();
horariosExternosAdminRouter.use(requireAuth, requireAdmin);
horariosExternosAdminRouter.get('/', requirePermission('horarios', 'ver'), asyncHandler(controller.getActividades));
horariosExternosAdminRouter.post('/actualizar', requirePermission('horarios', 'editar'), asyncHandler(controller.postActualizar));
