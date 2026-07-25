import { Router } from 'express';
import * as controller from '../controllers/catalogs.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const catalogsRouter = Router();

catalogsRouter.use(requireAuth, requireAdmin);

catalogsRouter.get('/', asyncHandler(controller.getCatalogos));
catalogsRouter.post('/tipos-actividad', asyncHandler(controller.postTipoActividad));
catalogsRouter.post('/ubicaciones', asyncHandler(controller.postUbicacion));
catalogsRouter.post('/responsables', asyncHandler(controller.postResponsable));
