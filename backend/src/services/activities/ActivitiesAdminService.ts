import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/activitiesRepository';
import type { ActividadAdminInput, ActividadCompleta, ActividadInputRow, ResidenteOverrideInput } from '../../providers/activities/ActivityTypes';
import * as auditService from '../audit/AuditService';
import * as notificationsService from '../notifications/NotificationsAdminService';
import { logger } from '../../logging/logger';
import { StatusCodes } from 'http-status-codes';

/** Porteo de `backoffice/src/services/actividadesService.ts` — operaciones admin-only (backoffice). */

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

function normalizarHora(h?: string | null): string | null {
  if (!h) return null;
  return h.length === 5 ? `${h}:00` : h;
}

function aRow(organizacionId: string, input: ActividadAdminInput): ActividadInputRow {
  return {
    organizacion_id: organizacionId,
    tipo_actividad_id: input.tipo_actividad_id || null,
    ubicacion_id: input.ubicacion_id || null,
    responsable_id: input.responsable_id || null,
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
    emoji_icono: input.emoji_icono ?? null,
    fecha: input.fecha,
    hora_inicio: normalizarHora(input.hora_inicio)!,
    hora_fin: normalizarHora(input.hora_fin),
    es_recurrente: input.es_recurrente,
    patron_recurrencia: input.patron_recurrencia ?? null,
    secciones_objetivo: input.secciones_objetivo?.length ? input.secciones_objetivo : null,
    recordatorio_minutos_antes: input.recordatorio_minutos_antes ?? null,
  };
}

/**
 * "Notificar a residentes al crear" (módulo Notificaciones) — desactivado por
 * defecto en el form, el admin decide si tildarlo. Reutiliza el mismo destino
 * (secciones_objetivo) que ya tiene la actividad; si apunta a varias secciones,
 * se manda una notificación por sección (mismo criterio que los recordatorios
 * automáticos en `NotificationsProcessorService`). Best-effort: si falla el
 * envío, no rompe la creación/edición de la actividad en sí.
 */
async function notificarActividad(user: AuthUser, organizacionId: string, input: ActividadAdminInput): Promise<void> {
  if (!input.notificar_al_crear) return;
  try {
    const secciones = input.secciones_objetivo?.length ? input.secciones_objetivo : [null];
    for (const seccion of secciones) {
      await notificationsService.crear(
        user,
        {
          titulo: '📅 Nueva actividad',
          mensaje: `Hoy a las ${input.hora_inicio} comienza "${input.nombre}".`,
          tipo: 'actividad',
          destino_tipo: seccion ? 'seccion' : 'todos',
          destino_filtro: seccion ? { seccion } : null,
          programacion_tipo: 'instantanea',
          pantalla_destino: 'horarios',
        },
        'enviar',
      );
    }
  } catch (err) {
    logger.warn('[actividades] no se pudo notificar la actividad', { error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * Genera una fila por ocurrencia futura de una actividad recurrente (día
 * siguiente a la plantilla hasta `patron_recurrencia.hasta` o +1 año, tope
 * 365 filas). Pura lógica de fechas — el insert en lotes de 100 vive en el
 * Repository. Porteo textual de `generarOcurrencias`.
 */
async function generarOcurrencias(organizacionId: string, plantillaId: string, input: ActividadAdminInput): Promise<string[]> {
  const diasSemana = input.patron_recurrencia?.dias_semana;
  if (!diasSemana?.length) return [];

  const fechaInicio = new Date(`${input.fecha}T00:00:00`);
  const fechaFin = input.patron_recurrencia?.hasta
    ? new Date(`${input.patron_recurrencia.hasta}T00:00:00`)
    : new Date(fechaInicio.getFullYear() + 1, fechaInicio.getMonth(), fechaInicio.getDate());

  const rows: ActividadInputRow[] = [];
  const cursor = new Date(fechaInicio);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= fechaFin && rows.length < 365) {
    if (diasSemana.includes(cursor.getDay())) {
      rows.push({
        ...aRow(organizacionId, input),
        fecha: cursor.toISOString().slice(0, 10),
        es_recurrente: true,
        activo: true,
        plantilla_id: plantillaId,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return repo.insertOcurrenciasBatch(rows);
}

export async function listar(user: AuthUser, fecha?: string): Promise<ActividadCompleta[]> {
  return repo.listarActividadesAdmin(requireOrganizacionId(user), fecha);
}

export async function obtenerPorId(id: string): Promise<ActividadCompleta> {
  const actividad = await repo.obtenerActividadAdmin(id);
  if (!actividad) throw new HttpError(StatusCodes.NOT_FOUND, 'Actividad no encontrada.');
  return actividad;
}

export async function crear(user: AuthUser, input: ActividadAdminInput): Promise<string> {
  const organizacionId = requireOrganizacionId(user);
  const { residentesOverride } = input;

  const id = await repo.insertActividad({ ...aRow(organizacionId, input), activo: true });
  await repo.sincronizarResidentesOverride(id, residentesOverride);

  if (input.es_recurrente && input.patron_recurrencia?.dias_semana?.length) {
    await repo.marcarComoPlantilla(id);
    const idsOcurrencias = await generarOcurrencias(organizacionId, id, input);
    await repo.propagarOverrideAOcurrencias(idsOcurrencias, residentesOverride);
  }

  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'actividades',
    registroId: id,
    descripcion: `Creó la actividad "${input.nombre}"`,
    datosNuevos: { ...input, residentesOverride: undefined },
  });

  await notificarActividad(user, organizacionId, input);
  return id;
}

export async function actualizar(user: AuthUser, id: string, input: ActividadAdminInput): Promise<void> {
  const organizacionId = requireOrganizacionId(user);
  const { residentesOverride } = input;

  const { plantillaId, fecha: fechaActual } = await repo.getPlantillaIdYFecha(id);
  const camposComunes = { ...aRow(organizacionId, input), organizacion_id: undefined, updated_at: new Date().toISOString() };

  if (plantillaId) {
    // ── La actividad pertenece a un grupo recurrente ──────────────────────
    if (!input.es_recurrente) {
      // Convirtiendo a única vez: borrar ocurrencias y limpiar plantilla_id
      await repo.eliminarOcurrencias(plantillaId);
      await repo.updateActividad(plantillaId, { ...camposComunes, fecha: input.fecha, plantilla_id: null });
    } else {
      await repo.updateActividad(plantillaId, camposComunes);
      await repo.eliminarOcurrencias(plantillaId);
      const fechaInicio = fechaActual ?? input.fecha;
      const idsOcurrencias = await generarOcurrencias(organizacionId, plantillaId, { ...input, fecha: fechaInicio });
      await repo.propagarOverrideAOcurrencias(idsOcurrencias, residentesOverride);
    }
    await repo.sincronizarResidentesOverride(plantillaId, residentesOverride);

    await auditService.registrarAuditoria(user, {
      accion: 'editar',
      tabla: 'actividades',
      registroId: plantillaId,
      descripcion: `Editó la actividad "${input.nombre}" (todas las repeticiones)`,
      datosNuevos: { ...input, residentesOverride: undefined },
    });
  } else {
    // ── Actividad única (sin grupo) ────────────────────────────────────────
    if (input.es_recurrente && input.patron_recurrencia?.dias_semana?.length) {
      await repo.updateActividad(id, { ...camposComunes, fecha: input.fecha, plantilla_id: id });
      const idsOcurrencias = await generarOcurrencias(organizacionId, id, input);
      await repo.propagarOverrideAOcurrencias(idsOcurrencias, residentesOverride);
    } else {
      await repo.updateActividad(id, { ...camposComunes, fecha: input.fecha });
    }
    await repo.sincronizarResidentesOverride(id, residentesOverride);

    await auditService.registrarAuditoria(user, {
      accion: 'editar',
      tabla: 'actividades',
      registroId: id,
      descripcion: `Editó la actividad "${input.nombre}"`,
      datosNuevos: { ...input, residentesOverride: undefined },
    });
  }
}

export async function setActivo(user: AuthUser, id: string, activo: boolean, nombre?: string): Promise<void> {
  const { plantillaId } = await repo.getPlantillaIdYFecha(id);

  if (plantillaId) {
    await repo.setActivoGrupo(plantillaId, activo);
  } else {
    await repo.setActivoUno(id, activo);
  }

  await auditService.registrarAuditoria(user, {
    accion: activo ? 'reactivar' : 'pausar',
    tabla: 'actividades',
    registroId: plantillaId ?? id,
    descripcion: `${activo ? 'Reactivó' : 'Pausó'} la actividad${nombre ? ` "${nombre}"` : ''}`,
  });
}

export async function eliminar(user: AuthUser, id: string, nombre?: string): Promise<void> {
  const { plantillaId } = await repo.getPlantillaIdYFecha(id);

  if (plantillaId) {
    await repo.eliminarGrupo(plantillaId);
  } else {
    await repo.eliminarUno(id);
  }

  await auditService.registrarAuditoria(user, {
    accion: 'eliminar',
    tabla: 'actividades',
    registroId: plantillaId ?? id,
    descripcion: `Eliminó la actividad${nombre ? ` "${nombre}"` : ''}`,
  });
}

export type { ResidenteOverrideInput };
