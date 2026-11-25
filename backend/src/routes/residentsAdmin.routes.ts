import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/residentsAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } });

export const residentsAdminRouter = Router();

residentsAdminRouter.use(requireAuth, requireAdmin);

// Importación masiva — antes de '/:id' para que no la tome como un id.
residentsAdminRouter.get('/import/template', requirePermission('usuarios', 'crear'), asyncHandler(controller.getPlantillaImportacion));
residentsAdminRouter.post('/import', requirePermission('usuarios', 'crear'), upload.single('archivo'), asyncHandler(controller.postImportar));

residentsAdminRouter.get('/', requirePermission('usuarios', 'ver'), asyncHandler(controller.getResidentes));
residentsAdminRouter.post('/', requirePermission('usuarios', 'crear'), asyncHandler(controller.postUsuario));
residentsAdminRouter.get('/:id', requirePermission('usuarios', 'ver'), asyncHandler(controller.getDetalle));
residentsAdminRouter.patch('/:id', requirePermission('usuarios', 'editar'), asyncHandler(controller.patchResidente));
residentsAdminRouter.delete('/:id', requirePermission('usuarios', 'eliminar'), asyncHandler(controller.deleteResidente));
residentsAdminRouter.patch('/:id/active', requirePermission('usuarios', 'editar'), asyncHandler(controller.patchActivo));
residentsAdminRouter.post('/:id/reset-password', requirePermission('usuarios', 'editar'), asyncHandler(controller.postResetPassword));
