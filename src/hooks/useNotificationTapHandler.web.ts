// Versión WEB: al tocar una notificación push, el Service Worker (public/sw.js) enfoca la
// ventana de ElderTech y le manda { type: 'NAVEGAR', url } — o, si la app estaba cerrada,
// abre la URL directo con `?notif=<id>`. Acá se navega y se marca la notificación como abierta.
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { marcarNotificacionAbierta } from '@/services/notificationsService';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saca `?notif=` de la URL (para que un refresh no la marque de nuevo) y la marca como abierta. */
function procesarNotifDeLaUrl(url: URL): string {
  const id = url.searchParams.get('notif');
  if (id && UUID.test(id)) void marcarNotificacionAbierta(id).catch(() => {});
  url.searchParams.delete('notif');
  return url.pathname + url.search;
}

export function useNotificationTapHandler(): void {
  const router = useRouter();

  useEffect(() => {
    // App abierta desde cero tocando una notificación: la URL ya es la pantalla destino.
    const actual = new URL(window.location.href);
    if (actual.searchParams.has('notif')) {
      window.history.replaceState(null, '', procesarNotifDeLaUrl(actual));
    }

    if (!('serviceWorker' in navigator)) return undefined;
    const alMensaje = (evento: MessageEvent) => {
      const datos = evento.data as { type?: string; url?: string } | null;
      if (datos?.type !== 'NAVEGAR' || typeof datos.url !== 'string') return;
      const destino = new URL(datos.url, window.location.origin);
      router.push(procesarNotifDeLaUrl(destino) as never);
    };
    navigator.serviceWorker.addEventListener('message', alMensaje);
    return () => navigator.serviceWorker.removeEventListener('message', alMensaje);
  }, [router]);
}
