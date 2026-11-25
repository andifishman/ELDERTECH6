# Mensajes del sistema y páginas 404 (estilo ElderTech)

Sin mascotas ni humor: logo de ElderTech, texto claro y una salida obvia.

| Dónde | Archivo | Qué dice |
|---|---|---|
| 404 del servidor, app web (mayores) | `public/404.html` (+ `ErrorDocument 404` en el `.htaccess` de `tools/deploy-ftp.mjs`) | Logo, saludo según la hora, fecha, "Cerrá la aplicación / Volvé a abrirla" |
| 404 de la app (celular y web, con sesión) | `app/+not-found.tsx` | Lo mismo + botón "Escuchar" |
| 404 del servidor, backoffice | `backoffice/public/404.html` (`/admin/404.html`) | Logo, "Página no encontrada", volver atrás / revisar el enlace, y la dirección pedida |
| 404 dentro del backoffice | `backoffice/src/components/common/NotFoundPage.tsx` | Igual que el anterior, dentro del panel |
| Notificaciones del backoffice | `backoffice/src/components/ui/toast.tsx` (`notify.success/error/info`) | Tarjeta con ícono según el caso |
| Error de carga de una pantalla | `ErrorState` en `backoffice/src/components/common/states.tsx` | "No pudimos cargar esto" + "Intentar de nuevo" |

## Criterios
- Decir **qué pasó** en lenguaje claro y **qué hacer**; nunca culpar a quien usa el sistema.
- Siempre una salida obvia (**Ir al inicio**, **Volver atrás**, **Intentar de nuevo**).
- **Los errores no desaparecen solos** (se cierran con "Entendido" o la ✕); éxitos e información sí, con una barrita de tiempo.
- Errores con `role="alert"`; el resto `role="status"` (lectores de pantalla). Contraste AA en claro y oscuro.
- App de mayores: botones ≥ 60 px, texto ≥ 18 px, y "Escuchar" (no habla solo).
- Los mensajes técnicos ("Failed to fetch", "Error 500 en /api/…") se traducen en `mensajeAmigable()` (toast.tsx).

## Para agregar un mensaje nuevo
`notify.error('No se pudo guardar', err.message)` — el título dice qué falló; el detalle se traduce solo si es técnico.

## F5 en /admin daba 404 (resuelto)
El `.htaccess` del backoffice perdía una barra invertida (`\.` dentro de un template string de JS queda `.`), así que la regla que
manda todo a `index.html` nunca se cumplía. En `tools/deploy-ftp.mjs` hay que escribir `\.` dentro de los template strings.
