import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/novedades.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/** App del residente: las novedades que le corresponden y marcar una como leída. */
export const novedadesRouter = Router();

novedadesRouter.use(requireAuth);

novedadesRouter.get('/', asyncHandler(controller.getListadoResidente));
novedadesRouter.post('/:id/leida', asyncHandler(controller.postMarcarLeida));

/** Backoffice: publicar, editar y eliminar novedades. */
export const novedadesAdminRouter = Router();

novedadesAdminRouter.use(requireAuth, requireAdmin);

novedadesAdminRouter.get('/', requirePermission('novedades', 'ver'), asyncHandler(controller.getListadoAdmin));
novedadesAdminRouter.post('/', requirePermission('novedades', 'crear'), asyncHandler(controller.postPublicar));
novedadesAdminRouter.post('/images', requirePermission('novedades', 'crear', 'editar'), upload.single('archivo'), asyncHandler(controller.postImagen));

novedadesAdminRouter.get('/:id', requirePermission('novedades', 'ver'), asyncHandler(controller.getDetalleAdmin));
novedadesAdminRouter.post('/:id/publicar', requirePermission('novedades', 'crear'), asyncHandler(controller.postPublicarBorrador));
novedadesAdminRouter.post('/:id/reenviar-aviso', requirePermission('novedades', 'editar'), asyncHandler(controller.postReenviarAviso));
novedadesAdminRouter.patch('/:id', requirePermission('novedades', 'editar'), asyncHandler(controller.patchActualizar));
novedadesAdminRouter.delete('/:id', requirePermission('novedades', 'eliminar'), asyncHandler(controller.deleteEliminar));
