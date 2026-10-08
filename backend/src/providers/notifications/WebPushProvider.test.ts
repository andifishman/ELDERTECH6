import { beforeEach, describe, expect, it, vi } from 'vitest';

const enviar = vi.hoisted(() => vi.fn());
const desactivar = vi.hoisted(() => vi.fn());

vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: enviar } }));
vi.mock('../../config/env', () => ({
  env: { vapidPublicKey: 'pub', vapidPrivateKey: 'priv', vapidSubject: 'mailto:test@test.com', expoAccessToken: undefined },
}));
vi.mock('../../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../repositories/deviceTokensRepository', () => ({ desactivarToken: desactivar }));

import { esTokenWeb, parsearSuscripcion, sendWebPushMessages, urlDeDestino } from './WebPushProvider';
import { sendPushMessages } from './ExpoPushProvider';

const suscripcion = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };
const tokenWeb = `webpush:${JSON.stringify(suscripcion)}`;

beforeEach(() => {
  enviar.mockReset();
  desactivar.mockReset();
  desactivar.mockResolvedValue(undefined);
});

describe('urlDeDestino', () => {
  it('abre la conversación de Hablemos', () => {
    expect(urlDeDestino({ pantallaDestino: 'hablemos', conversationId: 'c1' })).toBe('/mas/hablemos/c1');
  });
  it('abre el recordatorio de Agenda', () => {
    expect(urlDeDestino({ pantallaDestino: 'agenda', recordatorioId: 'r1' })).toBe('/agenda/r1');
  });
  it('mapea pantallas simples y cae en la home si no se conoce', () => {
    expect(urlDeDestino({ pantallaDestino: 'horarios' })).toBe('/horarios');
    expect(urlDeDestino({ pantallaDestino: 'inexistente' })).toBe('/');
    expect(urlDeDestino(undefined)).toBe('/');
  });
});

describe('suscripciones web', () => {
  it('distingue tokens web de tokens de Expo', () => {
    expect(esTokenWeb(tokenWeb)).toBe(true);
    expect(esTokenWeb('ExponentPushToken[xxx]')).toBe(false);
  });
  it('parsea una suscripción válida y rechaza una rota', () => {
    expect(parsearSuscripcion(tokenWeb)).toEqual(suscripcion);
    expect(parsearSuscripcion('webpush:{no es json')).toBeNull();
    expect(parsearSuscripcion('webpush:{"endpoint":"x"}')).toBeNull();
  });
});

describe('sendWebPushMessages', () => {
  it('envía el payload con la url de destino y devuelve ok', async () => {
    enviar.mockResolvedValue({});
    const [ticket] = await sendWebPushMessages([{ to: tokenWeb, title: 'Hola', body: 'Mensaje', data: { pantallaDestino: 'horarios' } }]);
    expect(ticket).toEqual({ status: 'ok' });
    const [sub, carga] = enviar.mock.calls[0] as [unknown, string];
    expect(sub).toEqual(suscripcion);
    expect(JSON.parse(carga)).toMatchObject({ title: 'Hola', body: 'Mensaje', url: '/horarios' });
  });

  it('da de baja la suscripción cuando el navegador responde 410', async () => {
    enviar.mockRejectedValue(Object.assign(new Error('gone'), { statusCode: 410 }));
    const [ticket] = await sendWebPushMessages([{ to: tokenWeb, title: 't', body: 'b' }]);
    expect(ticket?.status).toBe('error');
    expect(ticket?.details?.error).toBe('DeviceNotRegistered');
    expect(desactivar).toHaveBeenCalledWith(tokenWeb);
  });

  it('un error transitorio NO da de baja la suscripción', async () => {
    enviar.mockRejectedValue(Object.assign(new Error('boom'), { statusCode: 500 }));
    const [ticket] = await sendWebPushMessages([{ to: tokenWeb, title: 't', body: 'b' }]);
    expect(ticket?.status).toBe('error');
    expect(desactivar).not.toHaveBeenCalled();
  });
});

describe('sendPushMessages (reparto Expo / Web)', () => {
  it('mantiene los tickets alineados con la entrada cuando se mezclan plataformas', async () => {
    enviar.mockResolvedValue({});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok', id: 'ticket-expo-1' }, { status: 'ok', id: 'ticket-expo-2' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const tickets = await sendPushMessages([
      { to: 'ExponentPushToken[a]', title: '1', body: '1' },
      { to: tokenWeb, title: '2', body: '2' },
      { to: 'ExponentPushToken[b]', title: '3', body: '3' },
    ]);

    expect(tickets.map((t) => t.id ?? null)).toEqual(['ticket-expo-1', null, 'ticket-expo-2']);
    // Expo recibe solo los 2 mensajes nativos, nunca la suscripción web.
    const enviadoAExpo = JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body) as Array<{ to: string }>;
    expect(enviadoAExpo.map((m) => m.to)).toEqual(['ExponentPushToken[a]', 'ExponentPushToken[b]']);
    vi.unstubAllGlobals();
  });
});
