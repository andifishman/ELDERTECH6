import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/tutorialsAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const tutorialsAdminRouter = Router();

tutorialsAdminRouter.use(requireAuth, requireAdmin);

tutorialsAdminRouter.get('/', requirePermission('tutoriales', 'ver'), asyncHandler(controller.getTodos));
tutorialsAdminRouter.get('/trash', requirePermission('tutoriales', 'ver'), asyncHandler(controller.getEliminados));
tutorialsAdminRouter.post('/categories', requirePermission('tutoriales', 'crear'), asyncHandler(controller.postCategoria));
tutorialsAdminRouter.post('/images', requirePermission('tutoriales', 'crear', 'editar'), upload.single('archivo'), asyncHandler(controller.postImagen));
tutorialsAdminRouter.post('/audio', requirePermission('tutoriales', 'crear', 'editar'), upload.single('archivo'), asyncHandler(controller.postAudio));

tutorialsAdminRouter.get('/:id', requirePermission('tutoriales', 'ver'), asyncHandler(controller.getPorId));
tutorialsAdminRouter.get('/:id/steps', requirePermission('tutoriales', 'ver'), asyncHandler(controller.getPasos));
tutorialsAdminRouter.post('/', requirePermission('tutoriales', 'crear'), asyncHandler(controller.postTutorial));
tutorialsAdminRouter.patch('/:id', requirePermission('tutoriales', 'editar'), asyncHandler(controller.patchTutorial));
tutorialsAdminRouter.delete('/:id', requirePermission('tutoriales', 'eliminar'), asyncHandler(controller.deleteTutorial));
tutorialsAdminRouter.post('/:id/restore', requirePermission('tutoriales', 'editar'), asyncHandler(controller.postRestaurar));
tutorialsAdminRouter.delete('/:id/permanent', requirePermission('tutoriales', 'eliminar'), asyncHandler(controller.deletePermanente));
