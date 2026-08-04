import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/notificationsRepository';
import * as deviceTokensService from './DeviceTokensService';
import { sendPushMessages, type ExpoPushMessage } from '../../providers/notifications/ExpoPushProvider';
import { logger } from '../../logging/logger';
import type { DestinoFiltro, DestinoTipo, Notification, NotificationInput, RecipientStats } from '../../providers/notifications/NotificationTypes';
import { StatusCodes } from 'http-status-codes';

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

async function log(notificationId: string | null, user: AuthUser, accion: repo.AccionNotificacion, descripcion?: string): Promise<void> {
  try {
    await repo.registrarLog({ notificationId, usuarioId: user.supabaseUserId, accion, descripcion });
  } catch (err) {
    logger.warn('[notificaciones] no se pudo registrar el log', { error: err instanceof Error ? err.message : String(err) });
  }
}

export async function previsualizarAudiencia(
  user: AuthUser,
  destinoTipo: DestinoTipo,
  destinoFiltro: DestinoFiltro | null,
  excluirResidenteIds: string[] | null,
  incluirResidenteIds?: string[] | null,
): Promise<{ total: number; ids: string[]; muestra: Array<{ id: string; nombre: string; apellido: string }> }> {
  const organizacionId = requireOrganizacionId(user);
  const residentes = await repo.resolverAudiencia(organizacionId, destinoTipo, destinoFiltro, excluirResidenteIds, incluirResidenteIds);
  return { total: residentes.length, ids: residentes.map((r) => r.id), muestra: residentes.slice(0, 20) };
}

/**
 * Núcleo del envío — resuelve audiencia, arma el fanout de destinatarios
 * (uno por dispositivo activo; los residentes sin dispositivo quedan como
 * destinatario "fallido" para que se reflejen en las estadísticas), manda
 * los push vía Expo y actualiza cada fila con su ticket. No decide *cuándo*
 * llamar a esto — eso lo deciden `enviarAhora`/el procesador de programadas.
 */
async function ejecutarEnvio(notification: Notification): Promise<void> {
  const residentes = await repo.resolverAudiencia(
    notification.organizacion_id,
    notification.destino_tipo,
    notification.destino_filtro,
    notification.excluir_residente_ids,
    notification.incluir_residente_ids,
  );

  if (residentes.length === 0) {
    await repo.actualizarEstado(notification.id, { estado: 'fallida' });
    await repo.registrarLog({ notificationId: notification.id, usuarioId: notification.enviado_por, accion: 'error', descripcion: 'Sin destinatarios que coincidan con el destino elegido.' });
    return;
  }

  await repo.actualizarEstado(notification.id, { estado: 'enviando' });

  const tokens = await deviceTokensService.findTokensActivosPorResidentes(residentes.map((r) => r.id));
  const tokensPorResidente = new Map<string, typeof tokens>();
  for (const t of tokens) {
    if (!t.residente_id) continue;
    const lista = tokensPorResidente.get(t.residente_id) ?? [];
    lista.push(t);
    tokensPorResidente.set(t.residente_id, lista);
  }

  const filasDestinatarios: Array<{ residenteId: string; deviceTokenId: string | null }> = [];
  for (const r of residentes) {
    const dispositivos = tokensPorResidente.get(r.id) ?? [];
    if (dispositivos.length === 0) {
      filasDestinatarios.push({ residenteId: r.id, deviceTokenId: null });
    } else {
      for (const d of dispositivos) filasDestinatarios.push({ residenteId: r.id, deviceTokenId: d.id });
    }
  }

  const destinatarios = await repo.crearDestinatarios(notification.id, filasDestinatarios);

  // Los que no tienen dispositivo quedan directamente como fallidos — nunca llegan a Expo.
  const sinDispositivo = destinatarios.filter((d) => !d.device_token_id);
  await Promise.all(sinDispositivo.map((d) => repo.actualizarDestinatario(d.id, { estado: 'fallido', error_mensaje: 'El residente no tiene la app con notificaciones habilitadas.' })));

  const conDispositivo = destinatarios.filter((d) => d.device_token_id);
  if (conDispositivo.length > 0) {
    const tokenPorId = new Map(tokens.map((t) => [t.id, t.expo_push_token]));
    const mensajes: ExpoPushMessage[] = conDispositivo.map((d) => ({
      to: tokenPorId.get(d.device_token_id!) ?? '',
      title: notification.titulo,
      body: notification.mensaje,
      sound: notification.silenciosa ? null : notification.sonido ? 'default' : null,
      priority: notification.prioridad === 'alta' ? 'high' : notification.prioridad === 'baja' ? 'default' : 'normal',
      data: {
        notificationId: notification.id,
        pantallaDestino: notification.pantalla_destino ?? undefined,
        tipo: notification.tipo,
      },
    }));

    try {
      const tickets = await sendPushMessages(mensajes);
      await Promise.all(
        destinatarios
          .filter((d) => d.device_token_id)
          .map((d, i) => {
            const ticket = tickets[i];
            if (!ticket) return Promise.resolve();
            if (ticket.status === 'ok') {
              return repo.actualizarDestinatario(d.id, { estado: 'enviado', expo_ticket_id: ticket.id ?? null, enviado_en: new Date().toISOString() });
            }
            return repo.actualizarDestinatario(d.id, { estado: 'fallido', error_mensaje: ticket.message ?? ticket.details?.error ?? 'Error desconocido' });
          }),
      );
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al conectar con el servicio de notificaciones.';
      await Promise.all(conDispositivo.map((d) => repo.actualizarDestinatario(d.id, { estado: 'fallido', error_mensaje: mensaje })));
      await repo.registrarLog({ notificationId: notification.id, usuarioId: notification.enviado_por, accion: 'error', descripcion: mensaje });
    }
  }

  await repo.actualizarEstado(notification.id, { estado: 'enviada', enviada_en: new Date().toISOString() });
}

export type AccionCreacion = 'borrador' | 'enviar' | 'programar';

export async function crear(user: AuthUser, input: NotificationInput, accion: AccionCreacion): Promise<Notification> {
  const organizacionId = requireOrganizacionId(user);

  if (accion === 'programar' && !input.programada_para) {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Falta la fecha/hora de programación.');
  }

  const estadoInicial = accion === 'programar' ? 'programada' : 'borrador';
  let notification = await repo.crear(organizacionId, user.supabaseUserId, input, estadoInicial);
  await log(notification.id, user, 'crear', `Creó la notificación "${input.titulo}"`);

  if (accion === 'programar') {
    await log(notification.id, user, 'programar', `Programada para ${input.programada_para}`);
  }

  if (accion === 'enviar') {
    await repo.actualizarEstado(notification.id, { enviado_por: user.supabaseUserId });
    notification = { ...notification, enviado_por: user.supabaseUserId };
    await ejecutarEnvio(notification);
    await log(notification.id, user, 'enviar', 'Enviada inmediatamente al crearla');
    const actualizada = await repo.obtenerPorId(notification.id);
    if (actualizada) notification = actualizada;
  }

  return notification;
}

export async function actualizar(user: AuthUser, id: string, input: Partial<NotificationInput>): Promise<Notification> {
  const actual = await repo.obtenerPorId(id);
  if (!actual) throw new HttpError(StatusCodes.NOT_FOUND, 'Notificación no encontrada.');
  if (actual.estado !== 'borrador' && actual.estado !== 'programada') {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Solo se pueden editar notificaciones en borrador o programadas.');
  }
  const actualizada = await repo.actualizar(id, input);
  await log(id, user, 'editar', `Editó la notificación "${actualizada.titulo}"`);
  return actualizada;
}

export async function enviarAhora(user: AuthUser, id: string): Promise<Notification> {
  const notification = await repo.obtenerPorId(id);
  if (!notification) throw new HttpError(StatusCodes.NOT_FOUND, 'Notificación no encontrada.');
  if (notification.estado !== 'borrador' && notification.estado !== 'programada') {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Esta notificación ya fue procesada.');
  }
  await repo.actualizarEstado(id, { enviado_por: user.supabaseUserId });
  await ejecutarEnvio({ ...notification, enviado_por: user.supabaseUserId });
  await log(id, user, 'enviar', 'Enviada manualmente');
  return (await repo.obtenerPorId(id))!;
}

export async function programar(user: AuthUser, id: string, programadaPara: string, recurrencia?: NotificationInput['recurrencia']): Promise<Notification> {
  const notification = await repo.obtenerPorId(id);
  if (!notification) throw new HttpError(StatusCodes.NOT_FOUND, 'Notificación no encontrada.');
  if (notification.estado !== 'borrador') throw new HttpError(StatusCodes.BAD_REQUEST, 'Solo se pueden programar borradores.');

  const actualizada = await repo.actualizar(id, { programacion_tipo: 'programada', programada_para: programadaPara, recurrencia: recurrencia ?? 'ninguna' });
  await repo.actualizarEstado(id, { estado: 'programada' });
  await log(id, user, 'programar', `Programada para ${programadaPara}`);
  return { ...actualizada, estado: 'programada' };
}

export async function cancelar(user: AuthUser, id: string): Promise<void> {
  const notification = await repo.obtenerPorId(id);
  if (!notification) throw new HttpError(StatusCodes.NOT_FOUND, 'Notificación no encontrada.');
  if (notification.estado !== 'programada') throw new HttpError(StatusCodes.BAD_REQUEST, 'Solo se pueden cancelar notificaciones programadas.');
  await repo.actualizarEstado(id, { estado: 'cancelada', cancelada_en: new Date().toISOString() });
  await log(id, user, 'cancelar', 'Canceló la programación');
}

export async function reenviar(user: AuthUser, id: string): Promise<Notification> {
  const notification = await repo.obtenerPorId(id);
  if (!notification) throw new HttpError(StatusCodes.NOT_FOUND, 'Notificación no encontrada.');
  await repo.eliminarDestinatarios(id);
  await repo.actualizarEstado(id, { enviado_por: user.supabaseUserId });
  await ejecutarEnvio({ ...notification, enviado_por: user.supabaseUserId });
  await log(id, user, 'reenviar', 'Reenviada');
  return (await repo.obtenerPorId(id))!;
}

export async function duplicar(user: AuthUser, id: string): Promise<Notification> {
  const organizacionId = requireOrganizacionId(user);
  const original = await repo.obtenerPorId(id);
  if (!original) throw new HttpError(StatusCodes.NOT_FOUND, 'Notificación no encontrada.');

  const copia = await repo.crear(
    organizacionId,
    user.supabaseUserId,
    {
      titulo: `${original.titulo} (copia)`,
      mensaje: original.mensaje,
      imagen_url: original.imagen_url,
      icono: original.icono,
      tipo: original.tipo,
      destino_tipo: original.destino_tipo,
      destino_filtro: original.destino_filtro,
      excluir_residente_ids: original.excluir_residente_ids,
      incluir_residente_ids: original.incluir_residente_ids,
      programacion_tipo: 'instantanea',
      silenciosa: original.silenciosa,
      sonido: original.sonido,
      vibracion: original.vibracion,
      prioridad: original.prioridad,
      pantalla_destino: original.pantalla_destino,
    },
    'borrador',
  );
  await log(copia.id, user, 'duplicar', `Duplicada de "${original.titulo}"`);
  return copia;
}

export async function eliminar(user: AuthUser, id: string): Promise<void> {
  const notification = await repo.obtenerPorId(id);
  if (!notification) throw new HttpError(StatusCodes.NOT_FOUND, 'Notificación no encontrada.');
  await log(null, user, 'eliminar', `Eliminó la notificación "${notification.titulo}"`);
  await repo.eliminar(id);
}

export async function listar(user: AuthUser, filtros: repo.ListarFiltros): Promise<repo.ListarResultado> {
  const organizacionId = requireOrganizacionId(user);
  return repo.listar(organizacionId, filtros);
}

export interface NotificationDetalle {
  notification: Notification;
  stats: RecipientStats;
}

export async function obtenerDetalle(id: string): Promise<NotificationDetalle> {
  const notification = await repo.obtenerPorId(id);
  if (!notification) throw new HttpError(StatusCodes.NOT_FOUND, 'Notificación no encontrada.');
  const stats = await repo.obtenerStats(id);
  return { notification, stats };
}

export async function listarDestinatarios(id: string) {
  return repo.listarDestinatariosDetalle(id);
}

export async function listarLogs(id: string) {
  return repo.listarLogs(id);
}

/** Marca como abierta una notificación recibida — invocado por el residente, no por el backoffice. */
export async function marcarAbierto(notificationId: string, residenteId: string): Promise<void> {
  await repo.marcarAbierto(notificationId, residenteId);
}

export { ejecutarEnvio };
