import { Router } from 'express';
import * as controller from '../controllers/agendaCron.controller';
import { requireCronSecret } from '../middlewares/cron';
import { asyncHandler } from '../utils/asyncHandler';

export const agendaCronRouter = Router();

agendaCronRouter.use(requireCronSecret);
agendaCronRouter.post('/process', asyncHandler(controller.postProcesar));
// Vercel Cron invoca siempre con GET — mismo procesador, mismo CRON_SECRET.
agendaCronRouter.get('/process', asyncHandler(controller.postProcesar));
