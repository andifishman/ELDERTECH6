/* ElderTech — Service Worker (PWA).
 *
 * BUILD_ID lo reemplaza tools/postexport-web.mjs en cada `npm run build:web`:
 * así este archivo cambia byte a byte en cada deploy, el navegador detecta una
 * versión nueva y la app muestra el aviso "Actualizar" (ver src/pwa/).
 *
 * Qué se cachea y qué NO:
 *  - Navegaciones (HTML): red primero, con la copia guardada como respaldo offline.
 *  - JS/fuentes/imágenes con hash (/_expo/static, /assets) e íconos: cache primero.
 *  - NUNCA se toca: la API (otro origen), Supabase, audio/video (Range), ni nada que no sea GET.
 *    Los datos de los residentes no se guardan acá — eso lo maneja React Query en el cliente.
 */
const BUILD_ID = '__BUILD_ID__';
const CACHE_SHELL = 'eldertech-shell-' + BUILD_ID;
const CACHE_STATIC = 'eldertech-static-' + BUILD_ID;
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/favicon.ico'];
const TIMEOUT_RED_MS = 4000;

self.addEventListener('install', (event) => {
  // Sin skipWaiting automático: la versión nueva espera hasta que la persona toque
  // "Actualizar", para no recargar la pantalla en medio de una llamada o un mensaje.
  event.waitUntil(caches.open(CACHE_SHELL).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres
          .filter((n) => n.startsWith('eldertech-') && n !== CACHE_SHELL && n !== CACHE_STATIC)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function esEstatico(url) {
  return (
    url.pathname.startsWith('/_expo/static/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/splash/')
  );
}

async function redConTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_RED_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.headers.has('range')) return; // audio/video en streaming: que lo maneje el navegador
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API, Supabase, CDN de radios, etc.
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const respuesta = await redConTimeout(request);
          if (respuesta.ok) {
            const cache = await caches.open(CACHE_SHELL);
            cache.put('/', respuesta.clone());
          }
          return respuesta;
        } catch {
          // Sin red: la app es una SPA, cualquier ruta se resuelve con el mismo index.
          return (await caches.match('/')) || Response.error();
        }
      })(),
    );
    return;
  }

  if (esEstatico(url) || url.pathname === '/manifest.webmanifest' || url.pathname === '/favicon.ico') {
    event.respondWith(
      (async () => {
        const guardada = await caches.match(request);
        if (guardada) return guardada;
        const respuesta = await fetch(request);
        if (respuesta.ok) {
          const cache = await caches.open(CACHE_STATIC);
          cache.put(request, respuesta.clone());
        }
        return respuesta;
      })(),
    );
  }
});

/* ── Web Push ─────────────────────────────────────────────────────────────── */
// El backend (WebPushProvider) manda: { title, body, tag?, url, data }
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'ElderTech', body: event.data ? event.data.text() : '' };
  }
  const titulo = payload.title || 'ElderTech';
  // iOS exige mostrar SIEMPRE una notificación por cada push (userVisibleOnly):
  // si no se muestra, Safari cancela la suscripción.
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-48.png',
      tag: payload.tag || undefined,
      data: { url: payload.url || '/', ...(payload.data || {}) },
      lang: 'es-AR',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const destino = new URL(data.url || '/', self.location.origin);
  // La app lee ?notif= al abrir y marca la notificación como abierta (autenticada).
  if (data.notificationId) destino.searchParams.set('notif', data.notificationId);

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const ventana of ventanas) {
        if (new URL(ventana.url).origin === self.location.origin) {
          // focus() solo se permite con el gesto del toque en la notificacion; si el navegador lo rechaza igual se navega.
          try { await ventana.focus(); } catch { /* ignorar */ }
          ventana.postMessage({ type: 'NAVEGAR', url: destino.pathname + destino.search });
          return;
        }
      }
      await self.clients.openWindow(destino.href);
    })(),
  );
});
