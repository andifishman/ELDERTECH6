import { logger } from '../../logging/logger';
import * as repo from '../../repositories/agendaRepository';
import * as deviceTokensService from '../notifications/DeviceTokensService';
import { sendPushMessages } from '../../providers/notifications/ExpoPushProvider';
import { RECORDATORIO_OFFSET_MINUTOS } from '../../providers/agenda/AgendaTypes';
import { momentoDesdeFechaHoraArgentina } from '../../utils/argentinaTime';

/**
 * Cron de Agenda — corre cada 5 minutos (ver .github/workflows/notifications-cron.yml,
 * mismo mecanismo que ya usan las notificaciones de Actividades: el cron
 * nativo de Vercel Hobby solo permite 1 corrida diaria, así que el disparo
 * puntual real lo hace ese workflow de GitHub Actions). También queda un cron
 * diario en vercel.json como red de seguridad si el workflow externo fallara.
 */

/** Envía el push de los recordatorios cuya ventana de aviso (evento - 1 hora) ya llegó. */
export async function procesarNotificaciones(): Promise<{ enviados: number }> {
  const candidatos = await repo.listarCandidatosNotificacion();
  const ahora = Date.now();
  let enviados = 0;

  for (const r of candidatos) {
    const momentoEvento = momentoDesdeFechaHoraArgentina(r.fecha, r.hora);
    const momentoAviso = momentoEvento - RECORDATORIO_OFFSET_MINUTOS * 60_000;
    if (ahora < momentoAviso || ahora > momentoEvento) continue;

    try {
      const tokens = await deviceTokensService.findTokensActivosPorResidentes([r.residente_id]);
      if (tokens.length > 0) {
        const hora = r.hora.slice(0, 5);
        await sendPushMessages(
          tokens.map((t) => ({
            to: t.expo_push_token,
            title: `Recordatorio: ${r.titulo}`,
            body: `Falta una hora — hoy a las ${hora}.`,
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
