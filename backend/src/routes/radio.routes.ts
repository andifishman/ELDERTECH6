import { Router } from 'express';
import * as controller from '../controllers/radio.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const radioRouter = Router();

radioRouter.use(requireAuth);

radioRouter.get('/', asyncHandler(controller.getRadioData));
radioRouter.get('/:id/resolve', asyncHandler(controller.resolveStream));
