// Al tocar una notificación (app en background/cerrada), navega a la pantalla indicada y la marca como abierta.
// Versión NATIVA (expo-notifications). En web Metro usa useNotificationTapHandler.web.ts.
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AGENDA_ACCION_MARCAR_REALIZADO, PANTALLA_A_RUTA, registrarCategoriasNotificacion } from '@/utils/pushNotifications';
import { marcarNotificacionAbierta } from '@/services/notificationsService';
import { cambiarEstadoRecordatorio } from '@/services/agendaService';

export function useNotificationTapHandler() {
  const router = useRouter();

  useEffect(() => {
    void registrarCategoriasNotificacion();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { notificationId?: string; pantallaDestino?: string; conversationId?: string; recordatorioId?: string }
        | undefined;
      if (data?.notificationId) void marcarNotificacionAbierta(data.notificationId).catch(() => {});

      // Botón "✓ Realizado" tocado directo desde la notificación de Agenda —
      // no navega, solo marca el recordatorio (best-effort, no bloquea nada si falla).
      if (response.actionIdentifier === AGENDA_ACCION_MARCAR_REALIZADO && data?.recordatorioId) {
        void cambiarEstadoRecordatorio(data.recordatorioId, 'realizado').catch(() => {});
        return;
      }

      if (data?.pantallaDestino === 'hablemos' && data.conversationId) {
        router.push(`/mas/hablemos/${data.conversationId}` as never);
        return;
      }
      if (data?.pantallaDestino === 'agenda' && data.recordatorioId) {
        router.push(`/agenda/${data.recordatorioId}` as never);
        return;
      }
      const ruta = data?.pantallaDestino ? PANTALLA_A_RUTA[data.pantallaDestino] : undefined;
      if (ruta) router.push(ruta as never);
    });
    return () => sub.remove();
  }, [router]);
}
