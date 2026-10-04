import { Router } from 'express';
import * as controller from '../controllers/catalogs.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const catalogsRouter = Router();

catalogsRouter.use(requireAuth, requireAdmin);

// Las listas de apoyo (tipos, ubicaciones, responsables) las usan formularios de varios módulos: alcanza con ser admin.
catalogsRouter.get('/', asyncHandler(controller.getCatalogos));
catalogsRouter.post('/tipos-actividad', requirePermission('horarios', 'crear'), asyncHandler(controller.postTipoActividad));
catalogsRouter.post('/ubicaciones', requirePermission('horarios', 'crear'), asyncHandler(controller.postUbicacion));
catalogsRouter.post('/responsables', requirePermission('horarios', 'crear'), asyncHandler(controller.postResponsable));
