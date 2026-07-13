import { Router } from 'express';
import * as controller from '../controllers/activities.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const activitiesRouter = Router();

activitiesRouter.use(requireAuth);

activitiesRouter.get('/', asyncHandler(controller.getActivities));
activitiesRouter.get('/:id', asyncHandler(controller.getActivityById));
