import { HttpError } from '../../middlewares/errorHandler';
import * as repo from '../../repositories/activitiesRepository';
import * as residentsService from '../residents/ResidentsService';
import type { ActividadCompleta, ActividadConPrioridad } from '../../providers/activities/ActivityTypes';
import type { ActividadParaIA, ActividadPendienteRecordatorio } from '../../repositories/activitiesRepository';
import { StatusCodes } from 'http-status-codes';

/**
 * Devuelve las actividades del día visibles para este residente, según su
 * sección y las excepciones puntuales cargadas desde el backoffice.
 *
 * Porteo textual de `getActividadesPersonalizadas`
 * (src/services/actividadesService.ts):
 *  - Si el residente tiene una excepción explícita → manda la excepción.
 *  - Si no hay excepción → se muestra si la actividad no tiene secciones
 *    objetivo, o si la sección del residente está entre las secciones objetivo.
 *  - Prioridad 1 (⭐) cuando la actividad apunta a una sección específica y el
 *    residente coincide (o fue incluido por excepción); 3 = general.
 */
export async function getActividadesPersonalizadas(residenteId: string, fecha: Date): Promise<ActividadConPrioridad[]> {
  const { organizacionId, seccion: miSeccion } = await residentsService.getResidenteContext(residenteId);
  if (!organizacionId) throw new HttpError(StatusCodes.NOT_FOUND, 'No se pudo resolver la organización del residente.');

  const actividades = await repo.fetchActividadesPorFecha(organizacionId, fecha);

  const resultado = actividades
    .map((a: ActividadCompleta) => {
      const actSecciones = a.secciones_objetivo ?? null;
      const hasSeccionTarget = !!actSecciones?.length;
      const matchesSeccion = !hasSeccionTarget || (!!miSeccion && actSecciones!.includes(miSeccion));

      const override = a.actividad_residentes_override?.find((o) => o.residente_id === residenteId);
      const visible = override ? override.incluido : matchesSeccion;

      const prioridad: 1 | 3 = hasSeccionTarget && (override?.incluido ?? matchesSeccion) ? 1 : 3;
      const recomendada = prioridad === 1;

      return { actividad: a, visible, prioridad, recomendada };
    })
    .filter((r) => r.visible)
    .map(({ actividad, prioridad, recomendada }) => ({ ...actividad, prioridad, recomendada }) satisfies ActividadConPrioridad);

  return resultado.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
}

export async function getActividadById(id: string): Promise<ActividadCompleta> {
  const actividad = await repo.getActividadById(id);
  if (!actividad) throw new HttpError(StatusCodes.NOT_FOUND, 'Actividad no encontrada.');
  return actividad;
}

/** Búsqueda por texto (y opcionalmente hora) para la herramienta `buscar_actividades` del asistente de IA. */
export async function searchActividades(organizacionId: string, busqueda: string, fecha: Date, hora?: string): Promise<ActividadParaIA[]> {
  return repo.searchActivitiesByText(organizacionId, busqueda, fecha, hora);
}

/** Actividades con recordatorio pendiente de disparar — usado por el procesador de notificaciones. */
export async function listarCandidatasRecordatorio(): Promise<ActividadPendienteRecordatorio[]> {
  return repo.listarCandidatasRecordatorio();
}

export async function marcarRecordatorioEnviado(actividadId: string, notificationId: string): Promise<void> {
  await repo.marcarRecordatorioEnviado(actividadId, notificationId);
}
