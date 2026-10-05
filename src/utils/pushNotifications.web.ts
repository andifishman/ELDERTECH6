// Versión WEB de las utilidades de push — Metro la elige en lugar de pushNotifications.ts.
// expo-notifications no implementa Web Push real (no hay token de Expo en web), así que
// acá se usa la Push API del navegador + el Service Worker (public/sw.js). Ver src/pwa/avisosWeb.ts.
import { estaInstalada, nombreNavegador, obtenerTokenSilencioso } from '@/pwa/avisosWeb';

/** Mapeo de `pantalla_destino` a ruta — misma tabla que la versión nativa (el backend arma la `url` con la suya). */
export const PANTALLA_A_RUTA: Record<string, string> = {
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

export const AGENDA_ACCION_MARCAR_REALIZADO = 'marcar-realizado';

/** Las categorías con botones de acción no existen en Web Push de iOS — no hay nada que registrar. */
export async function registrarCategoriasNotificacion(): Promise<void> {}

/**
 * Registro SILENCIOSO al iniciar sesión: solo devuelve token si la persona YA activó los
 * avisos antes. El permiso nunca se pide acá (iOS exige un toque del usuario) — se pide
 * desde el botón "Activar avisos" (src/pwa/AvisosWebCard.tsx).
 */
export async function pedirPermisoYObtenerToken(): Promise<string | null> {
  return obtenerTokenSilencioso();
}

export function plataformaActual(): 'ios' | 'android' | 'web' {
  return 'web';
}

export function nombreDispositivo(): string {
  return nombreNavegador();
}

export { estaInstalada };
