import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/tutorialsAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const tutorialsAdminRouter = Router();

tutorialsAdminRouter.use(requireAuth, requireAdmin);

tutorialsAdminRouter.get('/', asyncHandler(controller.getTodos));
tutorialsAdminRouter.get('/trash', asyncHandler(controller.getEliminados));
tutorialsAdminRouter.post('/categories', asyncHandler(controller.postCategoria));
tutorialsAdminRouter.post('/images', upload.single('archivo'), asyncHandler(controller.postImagen));
tutorialsAdminRouter.post('/audio', upload.single('archivo'), asyncHandler(controller.postAudio));

tutorialsAdminRouter.get('/:id', asyncHandler(controller.getPorId));
tutorialsAdminRouter.get('/:id/steps', asyncHandler(controller.getPasos));
tutorialsAdminRouter.post('/', asyncHandler(controller.postTutorial));
tutorialsAdminRouter.patch('/:id', asyncHandler(controller.patchTutorial));
tutorialsAdminRouter.delete('/:id', asyncHandler(controller.deleteTutorial));
tutorialsAdminRouter.post('/:id/restore', asyncHandler(controller.postRestaurar));
tutorialsAdminRouter.delete('/:id/permanent', asyncHandler(controller.deletePermanente));
