import { Router } from 'express';
import * as controller from '../controllers/grupos.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const gruposRouter = Router();

gruposRouter.use(requireAuth, requireAdmin);

gruposRouter.get('/', requirePermission('grupos', 'ver'), asyncHandler(controller.getListado));
gruposRouter.post('/', requirePermission('grupos', 'crear'), asyncHandler(controller.postCrear));

gruposRouter.get('/:id', requirePermission('grupos', 'ver'), asyncHandler(controller.getDetalle));
gruposRouter.patch('/:id', requirePermission('grupos', 'editar'), asyncHandler(controller.patchActualizar));
gruposRouter.delete('/:id', requirePermission('grupos', 'eliminar'), asyncHandler(controller.deleteEliminar));

gruposRouter.get('/:id/disponibles', requirePermission('grupos', 'editar'), asyncHandler(controller.getDisponibles));
gruposRouter.post('/:id/miembros', requirePermission('grupos', 'editar'), asyncHandler(controller.postAgregarMiembros));
gruposRouter.delete('/:id/miembros/:residenteId', requirePermission('grupos', 'editar'), asyncHandler(controller.deleteMiembro));
