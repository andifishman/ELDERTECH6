// Servicio: registro de push token y marcado de notificaciones abiertas —
// habla con el backend propio (nunca con Supabase directo).
import { apiClient } from './apiClient';

export async function registrarPushToken(
  expoPushToken: string,
  plataforma: 'ios' | 'android' | 'web',
  dispositivo: string | null,
): Promise<void> {
  await apiClient.post<void>('/api/notifications/register-token', { expoPushToken, plataforma, dispositivo });
}

export async function marcarNotificacionAbierta(notificationId: string): Promise<void> {
  await apiClient.post<void>('/api/notifications/mark-opened', { notificationId });
}
