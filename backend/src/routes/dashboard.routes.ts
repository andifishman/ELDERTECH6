import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireAdmin);

dashboardRouter.get('/kpis', asyncHandler(controller.getKpis));
dashboardRouter.get('/activities-today', asyncHandler(controller.getActividadesHoy));
dashboardRouter.get('/residents-recent', asyncHandler(controller.getResidentesRecientes));
dashboardRouter.get('/tutorials-top', asyncHandler(controller.getTutorialesMasVistos));
dashboardRouter.get('/audit-recent', asyncHandler(controller.getActividadReciente));
dashboardRouter.get('/activities-by-category', asyncHandler(controller.getActividadesPorCategoria));
