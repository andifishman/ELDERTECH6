import { Router } from 'express';
import * as controller from '../controllers/notificationsCron.controller';
import { requireCronSecret } from '../middlewares/cron';
import { asyncHandler } from '../utils/asyncHandler';

export const notificationsCronRouter = Router();

notificationsCronRouter.use(requireCronSecret);
notificationsCronRouter.post('/process', asyncHandler(controller.postProcesar));
