import { Router } from 'express';
import * as controller from '../controllers/novedadesCron.controller';
import { requireCronSecret } from '../middlewares/cron';
import { asyncHandler } from '../utils/asyncHandler';

export const novedadesCronRouter = Router();

novedadesCronRouter.use(requireCronSecret);
novedadesCronRouter.post('/cleanup', asyncHandler(controller.postLimpiarVencidas));
// Vercel Cron invoca siempre con GET — mismo procesador, mismo CRON_SECRET.
novedadesCronRouter.get('/cleanup', asyncHandler(controller.postLimpiarVencidas));
