# Mensajes del sistema y páginas 404 (estilo ElderTech)

Personaje: **Mate** — un mate violeta (color de marca) con cara. Se pierde en la 404, se preocupa en los errores y sonríe
cuando algo salió bien. Mismo dibujo en todos lados:

| Dónde | Archivo |
|---|---|
| 404 del servidor (web / app instalada) | `public/404.html` (+ `ErrorDocument 404` en el `.htaccess` de `tools/deploy-ftp.mjs`) |
| 404 del servidor del backoffice | `backoffice/public/404.html` (se sirve en `/admin/404.html`) |
| 404 dentro del backoffice | `backoffice/src/components/common/NotFoundPage.tsx` |
| 404 de la app (celular y web) | `app/+not-found.tsx` + `src/components/common/MateIlustracion.tsx` |
| Notificaciones (toasts) del backoffice | `backoffice/src/components/ui/toast.tsx` (`notify.success/error/info`) |
| Error de carga de una pantalla | `ErrorState` en `backoffice/src/components/common/states.tsx` |
| El personaje en React | `backoffice/src/components/common/Mate.tsx` |

## Criterios (resumen de la investigación)
- Decir **qué pasó** en lenguaje claro y **qué hacer**; nunca culpar ("No es culpa tuya", no "Ingresaste mal…").
- La gracia es un extra: siempre hay una salida obvia (**Ir al inicio**, **Volver atrás**, **Intentar de nuevo**).
- **Los errores no desaparecen solos** (se cierran con "Entendido" o ✕); éxitos e información sí, con una barrita de tiempo.
- Errores con `role="alert"`; el resto `role="status"` (lectores de pantalla). Contraste AA en claro y oscuro.
- Botones ≥ 56 px en la app, texto ≥ 18 px, y "Escuchar" (no habla solo).
- `prefers-reduced-motion`: sin animaciones.
- Los mensajes técnicos ("Failed to fetch", "Error 500 en /api/…") se traducen en `mensajeAmigable()` (toast.tsx).

## Para agregar un mensaje nuevo
`notify.error('No se pudo guardar', err.message)` — el título dice qué falló; el detalle se traduce solo si es técnico.

## F5 en /admin daba 404 (resuelto)
El `.htaccess` del backoffice perdía una barra invertida (`\.` dentro de un template string de JS queda `.`), así que la regla que
manda todo a `index.html` nunca se cumplía. En `tools/deploy-ftp.mjs` hay que escribir `\.` dentro de los template strings.
