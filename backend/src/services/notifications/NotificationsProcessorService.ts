import { logger } from '../../logging/logger';
import * as notifRepo from '../../repositories/notificationsRepository';
import * as activitiesService from '../activities/ActivitiesService';
import { getPushReceipts } from '../../providers/notifications/ExpoPushProvider';
import { ejecutarEnvio } from './NotificationsAdminService';
import type { NotificationInput, Recurrencia } from '../../providers/notifications/NotificationTypes';

function siguienteOcurrencia(fechaISO: string, recurrencia: Recurrencia): string | null {
  const fecha = new Date(fechaISO);
  if (recurrencia === 'diaria') fecha.setDate(fecha.getDate() + 1);
  else if (recurrencia === 'semanal') fecha.setDate(fecha.getDate() + 7);
  else if (recurrencia === 'mensual') fecha.setMonth(fecha.getMonth() + 1);
  else return null;
  return fecha.toISOString();
}

/** Envía las notificaciones programadas cuya hora ya llegó, y si son recurrentes, agenda la próxima ocurrencia. */
export async function procesarProgramadas(): Promise<{ procesadas: number }> {
  const vencidas = await notifRepo.listarProgramadasVencidas();
  for (const n of vencidas) {
    try {
      await ejecutarEnvio(n);
      await notifRepo.registrarLog({ notificationId: n.id, usuarioId: n.creado_por, accion: 'enviar', descripcion: 'Enviada automáticamente (programación)' });

      if (n.recurrencia !== 'ninguna' && n.programada_para) {
        const proxima = siguienteOcurrencia(n.programada_para, n.recurrencia);
        if (proxima) {
          const input: NotificationInput = {
            titulo: n.titulo,
            mensaje: n.mensaje,
            imagen_url: n.imagen_url,
            icono: n.icono,
            tipo: n.tipo,
            destino_tipo: n.destino_tipo,
            destino_filtro: n.destino_filtro,
            excluir_residente_ids: n.excluir_residente_ids,
            incluir_residente_ids: n.incluir_residente_ids,
            programacion_tipo: 'programada',
            programada_para: proxima,
            recurrencia: n.recurrencia,
            silenciosa: n.silenciosa,
            sonido: n.sonido,
            vibracion: n.vibracion,
            prioridad: n.prioridad,
            pantalla_destino: n.pantalla_destino,
          };
          const siguiente = await notifRepo.crear(n.organizacion_id, n.creado_por ?? n.enviado_por ?? null, input, 'programada');
          await notifRepo.registrarLog({ notificationId: siguiente.id, usuarioId: n.creado_por, accion: 'programar', descripcion: `Próxima ocurrencia (${n.recurrencia}) de "${n.titulo}"` });
        }
      }
    } catch (err) {
      logger.error('[notificaciones] error al procesar programada', { id: n.id, error: err instanceof Error ? err.message : String(err) });
      await notifRepo.actualizarEstado(n.id, { estado: 'fallida' }).catch(() => {});
    }
  }
  return { procesadas: vencidas.length };
}

/** Consulta recibos de Expo para destinatarios ya "enviados" y marca entregado/fallido. */
export async function procesarRecibos(): Promise<{ chequeados: number }> {
  const pendientes = await notifRepo.listarDestinatariosConTicketPendiente();
  const idsConTicket = pendientes.filter((p) => p.expo_ticket_id).map((p) => p.expo_ticket_id as string);
  if (idsConTicket.length === 0) return { chequeados: 0 };

  const recibos = await getPushReceipts(idsConTicket);
  await Promise.all(
    pendientes.map((p) => {
      if (!p.expo_ticket_id) return Promise.resolve();
      const recibo = recibos[p.expo_ticket_id];
      if (!recibo) return Promise.resolve(); // todavía no está listo — se reintenta en la próxima corrida
      if (recibo.status === 'ok') {
        return notifRepo.actualizarDestinatario(p.id, { estado: 'entregado', entregado_en: new Date().toISOString() });
      }
      return notifRepo.actualizarDestinatario(p.id, { estado: 'fallido', error_mensaje: recibo.message ?? recibo.details?.error ?? 'Error de entrega' });
    }),
  );
  return { chequeados: idsConTicket.length };
}

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Genera y envía el recordatorio automático de una actividad cuando entra en su ventana configurada. */
export async function procesarRecordatoriosActividades(): Promise<{ enviados: number }> {
  const candidatas = await activitiesService.listarCandidatasRecordatorio();
  const ahora = Date.now();
  let enviados = 0;

  for (const act of candidatas) {
    const inicio = new Date(`${act.fecha}T${act.hora_inicio}`);
    const ventanaDesde = inicio.getTime() - act.recordatorio_minutos_antes * 60_000;
    // Ventana de disparo: desde que corresponde avisar hasta el propio inicio (nunca después).
    if (ahora < ventanaDesde || ahora > inicio.getTime()) continue;

    const diaSemana = NOMBRES_DIA[inicio.getDay()];
    const hora = act.hora_inicio.slice(0, 5);
    const lugar = act.ubicacion?.nombre ? ` en ${act.ubicacion.nombre}` : '';

    const input: NotificationInput = {
      titulo: '📅 Recordatorio de actividad',
      mensaje: `Hoy ${diaSemana} a las ${hora} comienza "${act.nombre}"${lugar}.`,
      tipo: 'recordatorio',
      destino_tipo: act.secciones_objetivo?.length ? 'seccion' : 'todos',
      // Si la actividad apunta a varias secciones, se manda una notificación por sección
      // (más simple y confiable que soportar "cualquiera de N secciones" en un solo destino_filtro).
      programacion_tipo: 'instantanea',
      pantalla_destino: 'horarios',
    };

    const secciones = act.secciones_objetivo?.length ? act.secciones_objetivo : [null];
    let ultimaNotificacion = null;
    for (const seccion of secciones) {
      const notification = await notifRepo.crear(
        act.organizacion_id,
        null,
        seccion ? { ...input, destino_filtro: { seccion } } : { ...input, destino_tipo: 'todos' },
        'enviando',
      );
      await ejecutarEnvio(notification);
      ultimaNotificacion = notification;
    }

    if (ultimaNotificacion) {
      await activitiesService.marcarRecordatorioEnviado(act.id, ultimaNotificacion.id);
      enviados += 1;
    }
  }

  return { enviados };
}

export async function procesarTodo() {
  const [programadas, recibos, recordatorios] = await Promise.all([
    procesarProgramadas(),
    procesarRecibos(),
    procesarRecordatoriosActividades(),
  ]);
  return { programadas, recibos, recordatorios };
}
