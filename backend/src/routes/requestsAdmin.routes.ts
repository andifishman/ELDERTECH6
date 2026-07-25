import { Router } from 'express';
import * as controller from '../controllers/requestsAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const requestsAdminRouter = Router();

requestsAdminRouter.use(requireAuth, requireAdmin);

requestsAdminRouter.get('/', asyncHandler(controller.getListado));
requestsAdminRouter.get('/:id', asyncHandler(controller.getDetalle));
requestsAdminRouter.patch('/:id/status', asyncHandler(controller.patchEstado));
requestsAdminRouter.delete('/:id', asyncHandler(controller.deletePedido));
requestsAdminRouter.post('/:id/retry-transcription', asyncHandler(controller.postReintentarTranscripcion));
