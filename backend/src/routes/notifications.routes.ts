import { Router } from 'express';
import * as controller from '../controllers/notifications.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.post('/register-token', asyncHandler(controller.postRegistrarToken));
notificationsRouter.post('/mark-opened', asyncHandler(controller.postMarcarAbierto));
