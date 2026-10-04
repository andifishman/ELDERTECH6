import { Router } from 'express';
import * as controller from '../controllers/configuracion.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const configuracionRouter = Router();

configuracionRouter.use(requireAuth, requireAdmin);

configuracionRouter.get('/', requirePermission('configuracion', 'ver'), asyncHandler(controller.getConfiguracion));
configuracionRouter.put('/', requirePermission('configuracion', 'editar'), asyncHandler(controller.putConfiguracion));
