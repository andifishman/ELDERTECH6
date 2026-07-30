import { Router } from 'express';
import * as controller from '../controllers/notificationsAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const notificationsAdminRouter = Router();

notificationsAdminRouter.use(requireAuth, requireAdmin);

notificationsAdminRouter.get('/', asyncHandler(controller.getListado));
notificationsAdminRouter.post('/', asyncHandler(controller.postCrear));
notificationsAdminRouter.post('/preview-audience', asyncHandler(controller.postPreviewAudiencia));

notificationsAdminRouter.get('/:id', asyncHandler(controller.getDetalle));
notificationsAdminRouter.patch('/:id', asyncHandler(controller.patchActualizar));
notificationsAdminRouter.delete('/:id', asyncHandler(controller.deleteEliminar));

notificationsAdminRouter.post('/:id/send', asyncHandler(controller.postEnviarAhora));
notificationsAdminRouter.post('/:id/schedule', asyncHandler(controller.postProgramar));
notificationsAdminRouter.post('/:id/cancel', asyncHandler(controller.postCancelar));
notificationsAdminRouter.post('/:id/resend', asyncHandler(controller.postReenviar));
notificationsAdminRouter.post('/:id/duplicate', asyncHandler(controller.postDuplicar));

notificationsAdminRouter.get('/:id/recipients', asyncHandler(controller.getDestinatarios));
notificationsAdminRouter.get('/:id/logs', asyncHandler(controller.getLogs));
