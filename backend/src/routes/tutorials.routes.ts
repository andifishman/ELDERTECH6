import { Router } from 'express';
import * as controller from '../controllers/tutorials.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const tutorialsRouter = Router();

tutorialsRouter.use(requireAuth);

// Rutas literales ANTES de '/:id' para que Express no las confunda con un id.
tutorialsRouter.get('/categories', asyncHandler(controller.getCategorias));
tutorialsRouter.get('/history', asyncHandler(controller.getHistorial));
tutorialsRouter.get('/favorites', asyncHandler(controller.getFavoritos));

tutorialsRouter.get('/', asyncHandler(controller.getTutoriales));
tutorialsRouter.get('/:id', asyncHandler(controller.getTutorialById));
tutorialsRouter.get('/:id/steps', asyncHandler(controller.getPasos));
tutorialsRouter.get('/:id/related', asyncHandler(controller.getRelacionados));
tutorialsRouter.post('/:id/progress', asyncHandler(controller.postProgreso));
tutorialsRouter.post('/:id/view', asyncHandler(controller.postVista));
