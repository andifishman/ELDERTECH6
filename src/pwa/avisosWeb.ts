// Avisos (Web Push) en el navegador / PWA — SOLO web. Nunca importar desde código nativo.
//
// Reglas reales de cada plataforma (verificadas en la documentación de Apple/MDN, ver docs/WEB_PWA.md):
//  - iPhone/iPad (iOS/iPadOS 16.4+): Web Push solo funciona si ElderTech está INSTALADA en
//    la pantalla de inicio. En una pestaña normal de Safari `PushManager` ni existe.
//  - El permiso hay que pedirlo desde un toque del usuario (un botón). Pedirlo "en frío"
//    al abrir la app falla en Safari y Chrome lo penaliza — por eso hay un botón "Activar avisos".
//  - Cada push TIENE que mostrar una notificación (userVisibleOnly); no hay pushes silenciosos en iOS.
//  - Los botones de acción de la notificación (ej. "✓ Realizado") no existen en iOS.
import { Platform } from 'react-native';
import { apiClient } from '@/services/apiClient';
import { registrarPushToken } from '@/services/notificationsService';

export type EstadoAvisos =
  | 'no-soportado' // el navegador no tiene Web Push (ej. Firefox Android viejo, iOS < 16.4)
  | 'requiere-instalar' // iPhone/iPad en Safari normal: primero hay que agregar a pantalla de inicio
  | 'denegado' // la persona bloqueó el permiso: hay que reactivarlo en Ajustes
  | 'pendiente' // se puede pedir permiso (botón)
  | 'activo';

interface NavigatorIOS extends Navigator {
  standalone?: boolean;
}

export function esIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** true si se abrió desde el ícono de la pantalla de inicio (PWA instalada). */
export function estaInstalada(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as NavigatorIOS).standalone === true;
}

function soportaPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function estadoAvisos(): EstadoAvisos {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'no-soportado';
  if (esIOS() && !estaInstalada()) return 'requiere-instalar';
  if (!soportaPush()) return 'no-soportado';
  if (Notification.permission === 'denied') return 'denegado';
  return Notification.permission === 'granted' ? 'activo' : 'pendiente';
}

/**
 * Como `estadoAvisos()`, pero si el permiso está "granted" confirma además que
 * haya una suscripción real en el navegador. El permiso del navegador es
 * PERMANENTE una vez concedido, pase lo que pase después — si en su momento la
 * suscripción falló (ej. el servidor no tenía las claves VAPID configuradas
 * todavía), el permiso quedaba en "granted" para siempre pero nunca hubo
 * suscripción real, y sin este chequeo la tarjeta mostraba "✅ ya activado"
 * (falso) escondiendo el botón para reintentar — la persona quedaba sin
 * forma de arreglarlo ella misma.
 */
export async function estadoAvisosReal(): Promise<EstadoAvisos> {
  const base = estadoAvisos();
  if (base !== 'activo') return base;
  try {
    const registro = await navigator.serviceWorker.ready;
    const sub = await registro.pushManager.getSubscription();
    return sub ? 'activo' : 'pendiente';
  } catch {
    return 'pendiente';
  }
}

function base64UrlABytes(base64Url: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const crudo = atob(base64);
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

function mismaClave(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a) return false;
  const va = new Uint8Array(a);
  return va.length === b.length && va.every((byte, i) => byte === b[i]);
}

/** Suscribe este navegador al servicio de push (reusa la suscripción si ya existe con la misma clave VAPID). */
async function suscribir(): Promise<PushSubscription> {
  const { publicKey } = await apiClient.get<{ publicKey: string }>('/api/notifications/web-push-key');
  const clave = base64UrlABytes(publicKey);
  const registro = await navigator.serviceWorker.ready;
  const existente = await registro.pushManager.getSubscription();
  if (existente) {
    if (mismaClave(existente.options.applicationServerKey, clave)) return existente;
    await existente.unsubscribe(); // la clave VAPID del servidor cambió: la suscripción vieja ya no sirve
  }
  return registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave as BufferSource });
}

/** Formato con el que el backend guarda las suscripciones web en `device_tokens.expo_push_token`. */
export function suscripcionAToken(sub: PushSubscription): string {
  return `webpush:${JSON.stringify(sub.toJSON())}`;
}

/** Si ya hay permiso, (re)registra la suscripción en el backend sin mostrar nada. null si no corresponde. */
export async function obtenerTokenSilencioso(): Promise<string | null> {
  if (estadoAvisos() !== 'activo') return null;
  try {
    return suscripcionAToken(await suscribir());
  } catch (err) {
    console.warn('[avisos-web] no se pudo suscribir en silencio', err);
    return null;
  }
}

export interface ResultadoActivacion {
  ok: boolean;
  mensaje: string;
}

/** Llamar SOLO desde el onPress de un botón (gesto del usuario). */
export async function activarAvisos(): Promise<ResultadoActivacion> {
  const estado = estadoAvisos();
  if (estado === 'requiere-instalar') {
    return { ok: false, mensaje: 'Primero agregá ElderTech a la pantalla de inicio de tu iPhone (botón Compartir › Agregar a inicio) y abrila desde ahí.' };
  }
  if (estado === 'no-soportado') {
    return { ok: false, mensaje: 'Este navegador no puede recibir avisos. Probá con Safari (iPhone) o Chrome (Android/PC).' };
  }
  if (estado === 'denegado') {
    return { ok: false, mensaje: 'Los avisos están bloqueados. Activalos en Ajustes del teléfono › Notificaciones › ElderTech (o en los permisos del sitio en el navegador).' };
  }
  try {
    const permiso = await Notification.requestPermission(); // primera espera: se mantiene el gesto
    if (permiso !== 'granted') {
      return { ok: false, mensaje: 'No se activaron los avisos porque no diste el permiso.' };
    }
    const token = suscripcionAToken(await suscribir());
    await registrarPushToken(token, 'web', nombreNavegador());
    return { ok: true, mensaje: 'Listo: vas a recibir avisos en este dispositivo.' };
  } catch (err) {
    console.warn('[avisos-web] error al activar', err);
    return { ok: false, mensaje: 'No se pudieron activar los avisos. Revisá tu conexión e intentá de nuevo.' };
  }
}

export function nombreNavegador(): string {
  const ua = navigator.userAgent;
  const plataforma = esIOS() ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Web';
  const navegador = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  return `${navegador} en ${plataforma}${estaInstalada() ? ' (app instalada)' : ''}`;
}
