import webpush from 'web-push';
import { env } from '../../config/env';
import { logger } from '../../logging/logger';
import { desactivarToken } from '../../repositories/deviceTokensRepository';
import type { ExpoPushMessage, ExpoPushTicket } from './ExpoPushProvider';

/**
 * Web Push (navegadores + PWA instalada en iPhone/Android/escritorio), estándar RFC 8030/8291 con VAPID.
 *
 * Las suscripciones web se guardan en la MISMA tabla que los tokens de Expo (`device_tokens.expo_push_token`,
 * `plataforma = 'web'`) con el prefijo `webpush:` seguido del JSON de la PushSubscription
 * ({ endpoint, keys: { p256dh, auth } }). Así no hace falta migrar el esquema y los 3 lugares que
 * mandan push (notificaciones del backoffice, Hablemos, Agenda) siguen llamando a `sendPushMessages`
 * sin enterarse de la plataforma: `sendPushMessages` reparte cada mensaje al proveedor que corresponde.
 */
export const PREFIJO_TOKEN_WEB = 'webpush:';

export function esTokenWeb(to: string): boolean {
  return to.startsWith(PREFIJO_TOKEN_WEB);
}

export function webPushConfigurado(): boolean {
  return !!env.vapidPublicKey && !!env.vapidPrivateKey;
}

// Misma tabla que PANTALLA_A_RUTA del cliente (src/utils/pushNotifications.ts) — duplicada porque son
// proyectos separados. En web la notificación abre una URL, no navega con el router.
const PANTALLA_A_RUTA: Record<string, string> = {
  home: '/',
  horarios: '/horarios',
  tutoriales: '/mas',
  asistente: '/asistente',
  clima: '/mas/clima',
  radio: '/mas/radio',
  pedidos: '/mas/pedidos',
  hablemos: '/mas/hablemos',
  agenda: '/agenda',
};

/** Ruta de la app a abrir al tocar la notificación, a partir de los mismos `data` que usa la app nativa. */
export function urlDeDestino(data: Record<string, unknown> | undefined): string {
  const pantalla = typeof data?.pantallaDestino === 'string' ? data.pantallaDestino : undefined;
  const conversationId = typeof data?.conversationId === 'string' ? data.conversationId : undefined;
  const recordatorioId = typeof data?.recordatorioId === 'string' ? data.recordatorioId : undefined;
  if (pantalla === 'hablemos' && conversationId) return `/mas/hablemos/${encodeURIComponent(conversationId)}`;
  if (pantalla === 'agenda' && recordatorioId) return `/agenda/${encodeURIComponent(recordatorioId)}`;
  return (pantalla && PANTALLA_A_RUTA[pantalla]) || '/';
}

export function parsearSuscripcion(to: string): webpush.PushSubscription | null {
  try {
    const sub = JSON.parse(to.slice(PREFIJO_TOKEN_WEB.length)) as Partial<webpush.PushSubscription>;
    if (typeof sub.endpoint !== 'string' || !sub.keys?.p256dh || !sub.keys.auth) return null;
    return { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
  } catch {
    return null;
  }
}

let configurado = false;
function configurarVapid(): void {
  if (configurado) return;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey as string, env.vapidPrivateKey as string);
  configurado = true;
}

/** Un ticket por mensaje, en el mismo orden — mismo contrato que `sendPushMessages` de Expo. */
export async function sendWebPushMessages(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (!webPushConfigurado()) {
    return messages.map(() => ({ status: 'error', message: 'Web Push no está configurado en el servidor (faltan las claves VAPID).' }));
  }
  configurarVapid();

  return Promise.all(
    messages.map(async (m): Promise<ExpoPushTicket> => {
      const suscripcion = parsearSuscripcion(m.to);
      if (!suscripcion) return { status: 'error', message: 'Suscripción web inválida.', details: { error: 'DeviceNotRegistered' } };

      const carga = JSON.stringify({
        title: m.title,
        body: m.body,
        url: urlDeDestino(m.data),
        data: m.data ?? {},
      });
      try {
        await webpush.sendNotification(suscripcion, carga, {
          TTL: 60 * 60 * 24, // si el teléfono está apagado, el aviso vale 24 h
          urgency: m.priority === 'high' ? 'high' : 'normal',
        });
        return { status: 'ok' };
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: el navegador dio de baja la suscripción (app desinstalada, permiso revocado) — no reintentar nunca más.
        if (status === 404 || status === 410) {
          await desactivarToken(m.to).catch(() => {});
          return { status: 'error', message: 'La suscripción web ya no existe.', details: { error: 'DeviceNotRegistered' } };
        }
        logger.warn('[webpush] falló el envío', { status, error: err instanceof Error ? err.message : String(err) });
        return { status: 'error', message: `Web Push respondió ${status ?? 'sin respuesta'}.` };
      }
    }),
  );
}
