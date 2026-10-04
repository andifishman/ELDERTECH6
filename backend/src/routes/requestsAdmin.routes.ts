import { Router } from 'express';
import * as controller from '../controllers/requestsAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const requestsAdminRouter = Router();

requestsAdminRouter.use(requireAuth, requireAdmin);

requestsAdminRouter.get('/', requirePermission('pedidos', 'ver'), asyncHandler(controller.getListado));
requestsAdminRouter.get('/:id', requirePermission('pedidos', 'ver'), asyncHandler(controller.getDetalle));
requestsAdminRouter.patch('/:id/status', requirePermission('pedidos', 'editar'), asyncHandler(controller.patchEstado));
requestsAdminRouter.delete('/:id', requirePermission('pedidos', 'eliminar'), asyncHandler(controller.deletePedido));
requestsAdminRouter.post('/:id/retry-transcription', requirePermission('pedidos', 'editar'), asyncHandler(controller.postReintentarTranscripcion));
