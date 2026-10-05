// Registro del Service Worker y detección de versiones nuevas — SOLO web.
//
// Flujo de actualización: cada deploy cambia byte a byte /sw.js (tools/postexport-web.mjs
// estampa un BUILD_ID). El navegador lo detecta, instala la versión nueva y la deja en
// "waiting" (no hay skipWaiting automático, ver public/sw.js). Acá se avisa a la UI
// (<BannersPwa />) y, cuando la persona toca "Actualizar", se activa y se recarga.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const REVISAR_CADA_MS = 30 * 60 * 1000; // una PWA instalada puede quedar abierta días: se revisa sola

let registro: ServiceWorkerRegistration | null = null;
let recargando = false;
const oyentes = new Set<(hay: boolean) => void>();

function hayEsperando(): boolean {
  return !!registro?.waiting && !!navigator.serviceWorker.controller;
}

function avisar(): void {
  const hay = hayEsperando();
  oyentes.forEach((fn) => fn(hay));
}

function vigilar(reg: ServiceWorkerRegistration): void {
  registro = reg;
  avisar();
  reg.addEventListener('updatefound', () => {
    const nuevo = reg.installing;
    nuevo?.addEventListener('statechange', () => {
      if (nuevo.state === 'installed') avisar();
    });
  });
}

/** Registra /sw.js. Solo en builds de producción: en `expo start` no hay SW (el caché estorbaría al desarrollar). */
export function registrarServiceWorker(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;

  const registrar = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        vigilar(reg);
        setInterval(() => void reg.update().catch(() => {}), REVISAR_CADA_MS);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => {});
        });
      })
      .catch((err) => console.warn('[pwa] no se pudo registrar el service worker', err));
  };
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar, { once: true });

  // Cuando el SW nuevo toma el control (tras SKIP_WAITING) se recarga UNA vez para usar el código nuevo.
  // Excepción: la primera instalación (no había controlador) no recarga — no hay versión vieja que reemplazar.
  const teniaControlador = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando || !teniaControlador) return;
    recargando = true;
    window.location.reload();
  });
}

/** Activa la versión nueva que está esperando. La recarga la dispara `controllerchange`. */
export function aplicarActualizacion(): void {
  registro?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

export function useHayActualizacionWeb(): boolean {
  const [hay, setHay] = useState(false);
  useEffect(() => {
    oyentes.add(setHay);
    setHay(hayEsperando());
    return () => {
      oyentes.delete(setHay);
    };
  }, []);
  return hay;
}

export type ResultadoBusqueda = 'al-dia' | 'hay-nueva' | 'sin-service-worker';

/** Botón "Buscar actualizaciones" (Más › Accesibilidad) — pregunta al servidor si hay una versión nueva. */
export async function buscarActualizacionWeb(): Promise<ResultadoBusqueda> {
  if (!registro) return 'sin-service-worker';
  await registro.update();
  // Si la versión nueva recién empezó a instalarse, esperar a que termine (máx. ~10 s).
  const nuevo = registro.installing;
  if (nuevo) {
    await new Promise<void>((resolver) => {
      const limite = setTimeout(resolver, 10_000);
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' || nuevo.state === 'redundant') {
          clearTimeout(limite);
          resolver();
        }
      });
    });
  }
  return hayEsperando() ? 'hay-nueva' : 'al-dia';
}

/** Identificador del build web que está corriendo (lo escribe tools/postexport-web.mjs en /version.json). */
export async function versionDelBuildWeb(): Promise<string | null> {
  try {
    const respuesta = await fetch('/version.json', { cache: 'no-store' });
    if (!respuesta.ok) return null;
    const { buildId } = (await respuesta.json()) as { buildId?: string };
    return buildId ?? null;
  } catch {
    return null;
  }
}
