import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as dashboardService from '../services/dashboard/DashboardService';
import { limiteQuerySchema } from '../validators/dashboard.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

export async function getKpis(req: Request, res: Response): Promise<void> {
  res.json(await dashboardService.obtenerKpis(requireUser(req)));
}

export async function getActividadesHoy(req: Request, res: Response): Promise<void> {
  res.json(await dashboardService.obtenerActividadesHoy(requireUser(req)));
}

export async function getResidentesRecientes(req: Request, res: Response): Promise<void> {
  const { limite } = limiteQuerySchema.parse(req.query);
  res.json(await dashboardService.obtenerResidentesRecientes(requireUser(req), limite));
}

export async function getTutorialesMasVistos(req: Request, res: Response): Promise<void> {
  const { limite } = limiteQuerySchema.parse(req.query);
  res.json(await dashboardService.obtenerTutorialesMasVistos(limite));
}

export async function getActividadReciente(req: Request, res: Response): Promise<void> {
  const { limite } = limiteQuerySchema.parse(req.query);
  res.json(await dashboardService.obtenerActividadReciente(requireUser(req), limite));
}

export async function getActividadesPorCategoria(req: Request, res: Response): Promise<void> {
  res.json(await dashboardService.obtenerActividadesPorCategoria(requireUser(req)));
}
