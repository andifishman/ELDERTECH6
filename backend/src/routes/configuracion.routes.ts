import { Router } from 'express';
import * as controller from '../controllers/configuracion.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const configuracionRouter = Router();

configuracionRouter.use(requireAuth, requireAdmin);

configuracionRouter.get('/', asyncHandler(controller.getConfiguracion));
configuracionRouter.put('/', asyncHandler(controller.putConfiguracion));
