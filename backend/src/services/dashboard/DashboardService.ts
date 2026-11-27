import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/dashboardRepository';
import { feedAplicaA } from '../../config/feedHorarios';
import { logger } from '../../logging/logger';
import * as horariosExternos from '../horariosExternos/HorariosExternosService';
import { StatusCodes } from 'http-status-codes';

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

/**
 * Una actividad de hoy tal como la muestra el dashboard — mismo formato venga de la grilla
 * del Hogar (feed externo) o de la tabla propia `actividades`.
 */
export interface ActividadHoyDashboard {
  id: string;
  /** "HH:MM"; null si es "Horario a coordinar". */
  hora: string | null;
  nombre: string;
  emoji: string | null;
  lugar: string | null;
  /** Quién la da (tallerista / responsable). */
  detalle: string | null;
  suspendida: boolean;
}

/**
 * Las actividades de hoy son las MISMAS que ve el residente en la pantalla Actividades: para la
 * institución dueña del feed, la grilla del Hogar (no la tabla `actividades`, que ya no se usa ahí
 * y tenía actividades viejas); para las demás, su tabla propia.
 */
async function actividadesDeHoy(organizacionId: string): Promise<ActividadHoyDashboard[]> {
  if (feedAplicaA(organizacionId)) {
    const { actividades } = await horariosExternos.obtenerActividades('hoy');
    return actividades
      .map((a) => ({
        id: String(a.id),
        hora: a.hora,
        nombre: a.nombre,
        emoji: null,
        lugar: a.lugar,
        detalle: a.tallerista,
        suspendida: a.suspendido,
      }))
      // Las de "Horario a coordinar" (sin hora) van al final.
      .sort((x, y) => (x.hora ?? '99:99').localeCompare(y.hora ?? '99:99'));
  }
  const propias = await repo.obtenerActividadesHoy(organizacionId);
  return propias.map((a) => ({
    id: a.id,
    hora: a.hora_inicio ? a.hora_inicio.slice(0, 5) : null,
    nombre: a.nombre,
    emoji: a.emoji_icono ?? a.tipo_actividad?.emoji ?? null,
    lugar: a.ubicacion?.nombre ?? null,
    detalle: a.responsable ? `${a.responsable.nombre} ${a.responsable.apellido}` : null,
    suspendida: false,
  }));
}

export async function obtenerKpis(user: AuthUser) {
  const organizacionId = requireOrganizacionId(user);
  const kpis = await repo.obtenerKpis(organizacionId);
  if (!feedAplicaA(organizacionId)) return kpis;
  // Con la grilla del Hogar, "Actividades hoy" se cuenta de ahí. Si el feed no responde, los
  // demás KPIs se muestran igual (el contador queda en 0 en vez de romper todo el dashboard).
  try {
    const hoy = await actividadesDeHoy(organizacionId);
    return { ...kpis, actividadesHoy: hoy.filter((a) => !a.suspendida).length };
  } catch (err) {
    logger.warn('[dashboard] no se pudo leer la grilla del Hogar para el KPI', { error: err instanceof Error ? err.message : String(err) });
    return { ...kpis, actividadesHoy: 0 };
  }
}

export async function obtenerActividadesHoy(user: AuthUser): Promise<ActividadHoyDashboard[]> {
  return actividadesDeHoy(requireOrganizacionId(user));
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

export async function obtenerUsuariosPorSeccion(user: AuthUser) {
  return repo.obtenerUsuariosPorSeccion(requireOrganizacionId(user));
}

export async function obtenerActividadesPorCategoria(user: AuthUser) {
  return repo.obtenerActividadesPorCategoria(requireOrganizacionId(user));
}
