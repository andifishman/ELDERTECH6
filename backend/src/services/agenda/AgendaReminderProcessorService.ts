import { logger } from '../../logging/logger';
import * as repo from '../../repositories/agendaRepository';
import * as deviceTokensService from '../notifications/DeviceTokensService';
import { sendPushMessages } from '../../providers/notifications/ExpoPushProvider';

/**
 * Cron de Agenda — corre 1 vez por día (ver `vercel.json`), mismo criterio que
 * `NotificationsProcessorService.procesarRecordatoriosActividades`. Con esa
 * frecuencia, offsets finos ("10 minutos antes") no van a disparar al minuto
 * exacto — se disparan en la próxima corrida del cron que caiga dentro de la
 * ventana [fecha+hora-offset, fecha+hora]. Limitación conocida y documentada,
 * igual que la que ya acepta el recordatorio de Horarios.
 */

/** Envía el push de los recordatorios cuya ventana de aviso ya llegó. */
export async function procesarNotificaciones(): Promise<{ enviados: number }> {
  const candidatos = await repo.listarCandidatosNotificacion();
  const ahora = Date.now();
  let enviados = 0;

  for (const r of candidatos) {
    if (!r.hora || r.recordatorio_offset_minutos == null) continue;

    const momentoEvento = new Date(`${r.fecha}T${r.hora}`).getTime();
    const momentoAviso = momentoEvento - r.recordatorio_offset_minutos * 60_000;
    if (ahora < momentoAviso || ahora > momentoEvento) continue;

    try {
      const tokens = await deviceTokensService.findTokensActivosPorResidentes([r.residente_id]);
      if (tokens.length > 0) {
        const hora = r.hora.slice(0, 5);
        await sendPushMessages(
          tokens.map((t) => ({
            to: t.expo_push_token,
            title: `${r.icono ?? '📅'} ${r.titulo}`,
            body: r.descripcion?.trim() || `Hoy a las ${hora}`,
            sound: 'default',
            categoryId: 'agenda-recordatorio',
            data: { pantallaDestino: 'agenda', recordatorioId: r.id },
          })),
        );
      }
      await repo.marcarNotificacionEnviada(r.id);
      enviados += 1;
    } catch (err) {
      logger.error('[agenda] error al notificar recordatorio', { id: r.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { enviados };
}

/** Pasa a `vencido` los recordatorios `pendiente` cuya fecha+hora ya pasó. */
export async function procesarVencidos(): Promise<{ vencidos: number }> {
  const pendientes = await repo.listarPendientesParaVencer();
  if (pendientes.length === 0) return { vencidos: 0 };
  await repo.marcarVencidos(pendientes.map((r) => r.id));
  return { vencidos: pendientes.length };
}

export async function procesarTodo() {
  const [notificaciones, vencidos] = await Promise.all([procesarNotificaciones(), procesarVencidos()]);
  return { notificaciones, vencidos };
}
