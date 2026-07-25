import { Router } from 'express';
import * as controller from '../controllers/assistantAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const assistantAdminRouter = Router();

assistantAdminRouter.use(requireAuth, requireAdmin);

assistantAdminRouter.get('/faq', asyncHandler(controller.getFaqs));
assistantAdminRouter.post('/faq', asyncHandler(controller.postFaq));
assistantAdminRouter.patch('/faq/:id', asyncHandler(controller.patchFaq));
assistantAdminRouter.delete('/faq/:id', asyncHandler(controller.deleteFaq));
assistantAdminRouter.post('/faq/reorder', asyncHandler(controller.postReordenar));

assistantAdminRouter.get('/history', asyncHandler(controller.getHistorial));
assistantAdminRouter.get('/stats', asyncHandler(controller.getStats));
