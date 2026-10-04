import { Router } from 'express';
import * as controller from '../controllers/assistantAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const assistantAdminRouter = Router();

assistantAdminRouter.use(requireAuth, requireAdmin);

assistantAdminRouter.get('/faq', requirePermission('asistente', 'ver'), asyncHandler(controller.getFaqs));
assistantAdminRouter.post('/faq', requirePermission('asistente', 'crear'), asyncHandler(controller.postFaq));
assistantAdminRouter.patch('/faq/:id', requirePermission('asistente', 'editar'), asyncHandler(controller.patchFaq));
assistantAdminRouter.delete('/faq/:id', requirePermission('asistente', 'eliminar'), asyncHandler(controller.deleteFaq));
assistantAdminRouter.post('/faq/reorder', requirePermission('asistente', 'editar'), asyncHandler(controller.postReordenar));

assistantAdminRouter.get('/history', requirePermission('asistente', 'ver'), asyncHandler(controller.getHistorial));
assistantAdminRouter.get('/stats', requirePermission('asistente', 'ver'), asyncHandler(controller.getStats));
