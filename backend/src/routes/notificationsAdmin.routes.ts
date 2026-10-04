import { Router } from 'express';
import * as controller from '../controllers/notificationsAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const notificationsAdminRouter = Router();

notificationsAdminRouter.use(requireAuth, requireAdmin);

notificationsAdminRouter.get('/', requirePermission('notificaciones', 'ver'), asyncHandler(controller.getListado));
notificationsAdminRouter.post('/', requirePermission('notificaciones', 'crear'), asyncHandler(controller.postCrear));
notificationsAdminRouter.post('/preview-audience', requirePermission('notificaciones', 'ver'), asyncHandler(controller.postPreviewAudiencia));

notificationsAdminRouter.get('/:id', requirePermission('notificaciones', 'ver'), asyncHandler(controller.getDetalle));
notificationsAdminRouter.patch('/:id', requirePermission('notificaciones', 'editar'), asyncHandler(controller.patchActualizar));
notificationsAdminRouter.delete('/:id', requirePermission('notificaciones', 'eliminar'), asyncHandler(controller.deleteEliminar));

notificationsAdminRouter.post('/:id/send', requirePermission('notificaciones', 'editar'), asyncHandler(controller.postEnviarAhora));
notificationsAdminRouter.post('/:id/schedule', requirePermission('notificaciones', 'editar'), asyncHandler(controller.postProgramar));
notificationsAdminRouter.post('/:id/cancel', requirePermission('notificaciones', 'editar'), asyncHandler(controller.postCancelar));
notificationsAdminRouter.post('/:id/resend', requirePermission('notificaciones', 'editar'), asyncHandler(controller.postReenviar));
notificationsAdminRouter.post('/:id/duplicate', requirePermission('notificaciones', 'crear'), asyncHandler(controller.postDuplicar));

notificationsAdminRouter.get('/:id/recipients', requirePermission('notificaciones', 'ver'), asyncHandler(controller.getDestinatarios));
notificationsAdminRouter.get('/:id/logs', requirePermission('notificaciones', 'ver'), asyncHandler(controller.getLogs));
