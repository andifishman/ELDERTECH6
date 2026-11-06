import { Router } from 'express';
import * as controller from '../controllers/me.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.post('/connection', asyncHandler(controller.postConexion));
meRouter.get('/branding', asyncHandler(controller.getBranding));
