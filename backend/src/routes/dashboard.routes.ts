import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireAdmin);

dashboardRouter.get('/kpis', requirePermission('dashboard', 'ver'), asyncHandler(controller.getKpis));
dashboardRouter.get('/activities-today', requirePermission('dashboard', 'ver'), asyncHandler(controller.getActividadesHoy));
dashboardRouter.get('/residents-recent', requirePermission('dashboard', 'ver'), asyncHandler(controller.getResidentesRecientes));
dashboardRouter.get('/tutorials-top', requirePermission('dashboard', 'ver'), asyncHandler(controller.getTutorialesMasVistos));
dashboardRouter.get('/audit-recent', requirePermission('dashboard', 'ver'), asyncHandler(controller.getActividadReciente));
dashboardRouter.get('/activities-by-category', requirePermission('dashboard', 'ver'), asyncHandler(controller.getActividadesPorCategoria));
