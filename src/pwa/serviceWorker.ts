// Registro del Service Worker y detección de versiones nuevas — SOLO web.
//
// Flujo de actualización: cada deploy cambia byte a byte /sw.js (tools/postexport-web.mjs
// estampa un BUILD_ID). El navegador lo detecta, instala la versión nueva y la deja en
// "waiting" (no hay skipWaiting automático, ver public/sw.js). La versión nueva se aplica
// SOLA — sin carteles ni botones, igual que las OTA del celular (hooks/useActualizacionAutomatica.ts) —
// en un momento seguro: cuando la persona sale de la app (pestaña oculta) o justo al abrirla/volver,
// antes de que toque nada. Nunca con algo en curso (radio sonando, grabando, texto sin enviar —
// ver ./enCursoWeb.ts). "Más › Accesibilidad › Buscar actualizaciones" sigue existiendo a mano.
import { Platform } from 'react-native';
import { hayAlgoEnCurso } from './enCursoWeb';

const REVISAR_CADA_MS = 30 * 60 * 1000; // una PWA instalada puede quedar abierta días: se revisa sola
/** Tras abrir la app (o volver a ella), cuánto tiempo se considera "recién abierta" si nadie tocó nada. */
const VENTANA_ARRANQUE_MS = 20 * 1000;

let registro: ServiceWorkerRegistration | null = null;
let recargando = false;
let inicioVentana = Date.now();
let huboInteraccion = false;

function hayEsperando(): boolean {
  return !!registro?.waiting && !!navigator.serviceWorker.controller;
}

/** Aplica la versión nueva que está esperando, si es un momento seguro para recargar la página. */
function aplicarSiEsSeguro(): void {
  if (!hayEsperando() || hayAlgoEnCurso()) return;
  const oculta = document.visibilityState === 'hidden';
  const recienAbierta = !huboInteraccion && Date.now() - inicioVentana < VENTANA_ARRANQUE_MS;
  if (oculta || recienAbierta) aplicarActualizacion();
}

function vigilar(reg: ServiceWorkerRegistration): void {
  registro = reg;
  aplicarSiEsSeguro();
  reg.addEventListener('updatefound', () => {
    const nuevo = reg.installing;
    nuevo?.addEventListener('statechange', () => {
      if (nuevo.state === 'installed') aplicarSiEsSeguro();
    });
  });
}

/** Registra /sw.js. Solo en builds de producción: en `expo start` no hay SW (el caché estorbaría al desarrollar). */
export function registrarServiceWorker(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Sin cartel de "Instalar"/"Agregar a pantalla de inicio" (ni el propio de Chrome en Android):
  // confunde a los residentes, y el ícono se lo instala el equipo de ElderTech en persona.
  window.addEventListener('beforeinstallprompt', (e) => e.preventDefault());

  if (process.env.NODE_ENV !== 'production') return;

  const marcarInteraccion = () => {
    huboInteraccion = true;
  };
  window.addEventListener('pointerdown', marcarInteraccion, true);
  window.addEventListener('keydown', marcarInteraccion, true);

  const registrar = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        vigilar(reg);
        setInterval(() => void reg.update().catch(() => {}), REVISAR_CADA_MS);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            inicioVentana = Date.now();
            huboInteraccion = false;
            aplicarSiEsSeguro(); // una que quedó esperando (ej. la radio sonaba cuando salió)
            void reg.update().catch(() => {});
          } else {
            aplicarSiEsSeguro(); // la persona salió de la app: buen momento (al volver ya está la nueva)
          }
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
