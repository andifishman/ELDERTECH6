import { env } from '../../config/env';

const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const BATCH_SIZE = 100; // límite de Expo por request

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
  channelId?: string;
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function headers(): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  if (env.expoAccessToken) base.Authorization = `Bearer ${env.expoAccessToken}`;
  return base;
}

/**
 * Envía mensajes a través del servicio de Push de Expo (relay gratuito a
 * FCM/APNs). En Android, Expo solo hace de relay — igual hace falta FCM v1
 * configurado (google-services.json en el cliente + service account subida
 * a EAS Credentials) para que el relay tenga con qué entregar. Devuelve un
 * ticket por mensaje, en el mismo orden que la entrada. Un ticket `ok` NO
 * garantiza entrega — para eso hay que consultar `getReceipts` más tarde
 * (los recibos tardan un rato en estar listos y expiran a las 24hs).
 */
export async function sendPushMessages(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const tickets: ExpoPushTicket[] = [];
  for (const batch of chunk(messages, BATCH_SIZE)) {
    const res = await fetch(EXPO_PUSH_SEND_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Expo Push respondió ${res.status}: ${text}`);
    }
    const json = (await res.json()) as { data: ExpoPushTicket[] };
    tickets.push(...json.data);
  }
  return tickets;
}

/** Consulta el resultado final de entrega de tickets ya enviados (ver nota arriba). */
export async function getPushReceipts(ticketIds: string[]): Promise<Record<string, ExpoPushReceipt>> {
  const result: Record<string, ExpoPushReceipt> = {};
  for (const batch of chunk(ticketIds, 1000)) {
    if (batch.length === 0) continue;
    const res = await fetch(EXPO_PUSH_RECEIPTS_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ids: batch }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Expo Push (receipts) respondió ${res.status}: ${text}`);
    }
    const json = (await res.json()) as { data: Record<string, ExpoPushReceipt> };
    Object.assign(result, json.data);
  }
  return result;
}
