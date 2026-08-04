import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/dashboardRepository';
import { StatusCodes } from 'http-status-codes';

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

export async function obtenerKpis(user: AuthUser) {
  return repo.obtenerKpis(requireOrganizacionId(user));
}

export async function obtenerActividadesHoy(user: AuthUser) {
  return repo.obtenerActividadesHoy(requireOrganizacionId(user));
}

export async function obtenerResidentesRecientes(user: AuthUser, limite?: number) {
  return repo.obtenerResidentesRecientes(requireOrganizacionId(user), limite);
}

export async function obtenerTutorialesMasVistos(limite?: number) {
  return repo.obtenerTutorialesMasVistos(limite);
}

export async function obtenerActividadReciente(user: AuthUser, limite?: number) {
  return repo.obtenerActividadReciente(requireOrganizacionId(user), limite);
}

export async function obtenerActividadesPorCategoria(user: AuthUser) {
  return repo.obtenerActividadesPorCategoria(requireOrganizacionId(user));
}
