# ElderTech Web / PWA

Guía de la versión web de ElderTech (navegador, Safari/iPhone y PWA instalada), cómo desplegarla en un dominio de DonWeb y qué está probado y qué no.

## 1. Arquitectura elegida (y por qué)

```
Android (APK/EAS)  ──┐
Web / Safari / PWA ──┼──►  Backend BFF (backend/, Vercel)  ──►  Supabase / Groq / Open-Meteo …
Backoffice (Vite)  ──┘      + Supabase Auth (login/sesión)
```

**Un solo código para app y web: Expo Router + React Native Web** (ya estaba en el proyecto: `react-native-web`, `output: "single"`, `vercel.json`). Se descartó escribir una segunda app porque la lógica, la autenticación y los datos ya pasan por el BFF; la web solo cambia la capa de plataforma. Donde el navegador no puede hacer lo mismo que el celular, hay un adaptador por plataforma (archivos `.web.ts(x)` que Metro elige solo en web; Android/iOS no cambian):

| Tema | Nativo | Web |
|---|---|---|
| Alertas (`Alert.alert`) | del sistema | `src/utils/alertWeb.tsx` (en react-native-web `Alert.alert` **no hace nada**; 41 usos) |
| Subida de archivos (audio, fotos) | `FormData {uri,type,name}` | `src/utils/archivoForm.ts` (en web hay que adjuntar un `Blob` real) |
| Grabación de voz | expo-av | `src/utils/grabadora.web.ts` (MediaRecorder, formato negociado: mp4 en Safari) |
| Voz del asistente (micrófono) | graba + Whisper | igual: graba + Whisper (no Web Speech API: no funciona en PWA de iOS) |
| Reproducción (radio, mensajes de voz, sonidos) | expo-av | `src/utils/audioCompat.web.ts` (`play()` dentro del gesto del toque — requisito de Safari) |
| Voz en español / desbloqueo de audio | expo-speech | `src/utils/audioWeb.ts` (elige voz es-AR/es-419/es-*, desbloquea Safari en el 1er toque) |
| Llamar / WhatsApp | `tel:` / `whatsapp://` | `src/utils/enlaces.ts` (`tel:` + `https://wa.me/`) |
| Agregar contacto | libreta del teléfono | `SeleccionarContactoModal.web.tsx` (formulario; Contact Picker solo si el navegador lo trae) |
| Notificaciones | Expo Push | Web Push + VAPID (`src/pwa/avisosWeb.ts`, `public/sw.js`, backend `WebPushProvider.ts`) |
| Video de YouTube | WebView | `<iframe>` (`VideoYoutube.web.tsx`) |
| `adjustsFontSizeToFit` | nativo | `src/utils/ajusteTextoWeb.ts` (RN-web lo ignora → textos cortados con "…") |
| Texto grande (Accesibilidad) | parche de `Text` | `escalaTexto.ts` rama web (el parche nativo **crashea** en web) |
| Pantalla ancha | — | columna de 600 px centrada (`marcoWeb.ts`), mismo diseño y botones |
| Actualizaciones | expo-updates (OTA) | Service Worker + aviso "Actualizar ahora" |
| Cerrar sesión | no existe (celular personal) | botón en Más (equipos compartidos) |

La lógica, la sesión (Supabase Auth: `localStorage` en web, AsyncStorage en nativo) y **los permisos (validados en el backend)** son los mismos.

## 2. Cómo se ejecuta

```bash
npm install
cd backend && npm run dev            # el backend tiene que estar corriendo (:3001)
npx expo start --web                 # desarrollo (sin Service Worker a propósito)

# Build de producción + prueba local con las mismas cabeceras que Vercel:
npm run build:web                    # expo export -p web + estampa BUILD_ID en dist/sw.js
npm run serve:web                    # http://localhost:4173   (--permitir-http para backend local http)
```

> Si cambiás variables `EXPO_PUBLIC_*` y re-exportás en la misma PC, usá `npx expo export -p web --clear` (el caché de Metro conserva las variables viejas). `.env.production` gana sobre las variables del shell.

Backoffice: `cd backoffice && npm run dev` (ya funciona en navegador; `npm run build` compila).

## 3. Instalar en el iPhone (PWA)

1. Abrir la dirección de ElderTech **en Safari** (en Chrome de iPhone no se puede agregar a inicio con las mismas capacidades).
2. Botón **Compartir** → **Agregar a inicio** → **Agregar**.
3. Abrir ElderTech **desde el ícono nuevo**. En Más → "Activar avisos" para recibir notificaciones.

La app muestra sola un cartel con estos pasos en iPhone/iPad no instalados. En Android/Chrome muestra un botón "Instalar".

## 4. Limitaciones reales en Safari/iOS

- **Web Push solo funciona con la PWA instalada** (iOS/iPadOS 16.4+). En una pestaña de Safari `PushManager` no existe. El permiso se pide con un botón (Safari lo exige con un toque). No hay pushes silenciosos: cada push muestra una notificación.
- **Sin botones de acción en notificaciones** ("✓ Realizado" de Agenda no existe en iOS web; al tocar abre el recordatorio).
- **No se puede suprimir** el aviso de Hablemos cuando ya estás en ese chat (en nativo sí).
- **Radios con URL `http://`** no se pueden reproducir desde una página `https` (contenido mixto). Se intenta la versión `https` de la misma URL y, si no existe, la radio falla y se usa `urlFallback`. Las que solo tienen `http`/puertos raros (p. ej. `:9270`, `:7200`) **no andan en web**; hay que cargarles una URL https en la base. Un proxy de streams no entra en funciones serverless (límite de duración).
- **Autoplay**: el audio solo arranca tras un toque (la radio, "Escuchar" y mensajes ya cumplen). La lectura automática de la respuesta del asistente se "desbloquea" en el primer toque de la sesión.
- **Libreta de contactos**: no existe en web (Safari no tiene Contact Picker). Se cargan a mano.
- **Micrófono**: HTTPS obligatorio; si se rechaza el permiso se muestra cómo reactivarlo (Ajustes › Safari › Micrófono). En PWA iOS el permiso se vuelve a pedir en cada apertura.
- **Teclado virtual**: el alto de la app sigue al `visualViewport` (`public/index.html`) para que el input del chat no quede tapado — **no verificado en un iPhone real**.
- **Llamar**: `tel:` marca en el teléfono; en una PC sin telefonía no hace nada (el número se ve en pantalla). No se puede controlar el flujo de la llamada.
- **WhatsApp**: `https://wa.me/…` abre la app si está instalada. Volver a ElderTech: botón "atrás"/cambiar de app (iOS no permite volver automáticamente).
- Safari borra datos de sitios web que no se usan por ~7 días **solo en pestañas**, no en PWA instalada → otra razón para instalarla.
- Recuperar contraseña / registro: **no existen en la app del residente** (las cuentas las crea el backoffice con usuario+contraseña). El backoffice sí tiene "Olvidé mi contraseña" (ver §7, Redirect URLs).

## 5. Dominio de DonWeb: qué hace falta de verdad

Comprar el dominio **no alcanza**. Hacen falta (1) un lugar que sirva los archivos con **HTTPS**, (2) registros DNS que apunten ahí, (3) CORS/Supabase que conozcan el nuevo origen.

**Recomendación: DonWeb solo como registrador + DNS; el frontend en Vercel** (el backend ya está en Vercel; el repo ya trae `vercel.json` con SPA fallback, cabeceras y caché; deploy automático por Git; HTTPS automático). Un hosting compartido de DonWeb serviría archivos estáticos con SFTP y `.htaccess`, pero perdés deploy automático, hay que subir `dist/` a mano y cuidar a mano la caché de `sw.js`. Si se elige igual: subir `dist/`, regla de rewrite a `index.html` para rutas sin extensión, `Cache-Control: no-cache` en `sw.js`, y activar Let's Encrypt.
Ojo: el plan *Hobby* de Vercel es de uso no comercial; si Ledor Vador lo considera comercial, usar plan Pro o Cloudflare Pages/Netlify (misma estructura).

Subdominios sugeridos (reemplazar `TUDOMINIO.com.ar`):

| Host | Qué sirve | Proyecto Vercel (Root Directory) |
|---|---|---|
| `app.TUDOMINIO.com.ar` | ElderTech Web/PWA | raíz del repo (build `npm run build:web`, output `dist`) |
| `admin.TUDOMINIO.com.ar` | Backoffice | `backoffice` |
| `api.TUDOMINIO.com.ar` | Backend BFF | `backend` |

Registros DNS en la zona del dominio (en DonWeb: panel de dominios → administrar DNS/zona; **no pude verificar la interfaz de DonWeb**, los nombres de menú pueden variar):

| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | `app` | `cname.vercel-dns.com` |
| CNAME | `admin` | `cname.vercel-dns.com` |
| CNAME | `api` | `cname.vercel-dns.com` |
| A (solo si querés el dominio raíz) | `@` | el valor que muestre Vercel (histórico: `76.76.21.21`) |

Siempre copiar los valores exactos que Vercel muestra en *Project › Settings › Domains* al agregar cada dominio; el certificado SSL lo emite Vercel solo cuando el DNS propaga (minutos a horas). Si el dominio es `.com.ar`, el registro lo gestiona NIC Argentina: DonWeb tiene que tener los DNS delegados (por defecto lo hace).

## 6. Variables de entorno de producción

| Dónde | Variable | Valor |
|---|---|---|
| Frontend (`.env.production`, versionado — **sin secretos**) | `EXPO_PUBLIC_API_URL` | `https://api.TUDOMINIO.com.ar` |
| Frontend (variables de Vercel o `.env`) | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ORG_ID` | los de Supabase (la *anon key* es pública por diseño; RLS la protege) |
| Backend (Vercel, secretas) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, … | ya existentes — **nunca** en el frontend |
| Backend | `CORS_ALLOWED_ORIGINS` | `https://app.TUDOMINIO.com.ar,https://admin.TUDOMINIO.com.ar` (sin barra final). Sin esto el navegador bloquea todo: la app queda "sin datos". `https://eldertech6web.vercel.app` ya está permitido fijo en `backend/src/middlewares/cors.ts` (`ORIGENES_FIJOS`) — un dominio propio nuevo hay que agregarlo acá o ahí |
| Backend | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `npx web-push generate-vapid-keys` (una sola vez, no rotar). Sin ellas el push web queda deshabilitado |
| Backoffice | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ORG_ID` | análogas |

Cambiar `EXPO_PUBLIC_API_URL` de `.env.production` también afecta al APK/OTA (ver CLAUDE.md): el backend en `*.vercel.app` seguirá funcionando mientras esté en `CORS_ALLOWED_ORIGINS`/DNS.

## 7. Supabase (hacer en el dashboard — el MCP de Supabase no estaba autorizado en esta sesión, no se tocó nada)

- **Authentication › URL Configuration**: *Site URL* = `https://app.TUDOMINIO.com.ar`; *Redirect URLs*: `https://admin.TUDOMINIO.com.ar/reset-password` (el backoffice envía `redirectTo = <origen>/reset-password`; si no está en la lista, el mail de recuperación falla), y `http://localhost:5173/reset-password` para desarrollo. La app del residente no usa redirects ni OAuth.
- **No hay migraciones nuevas**: las suscripciones web se guardan en `device_tokens` (`plataforma='web'`, `expo_push_token='webpush:{json}'`). Storage: los buckets de audio ya aceptan `audio/webm` y `audio/mp4` (lo que graban Chrome y Safari).
- Realtime (Hablemos) usa `wss://` hacia Supabase: la CSP lo permite (`connect-src … wss:`).

## 8. Deploy y actualizaciones

1. Crear en Vercel 3 proyectos desde el mismo repo (ver tabla §5). El de la raíz usa `vercel.json` (build `npm run build:web`).
2. Cargar variables (§6), agregar dominios, configurar DNS (§5).
3. Cada `git push` a `main` redeploya. `build:web` cambia el `BUILD_ID` de `sw.js` → los celulares detectan la versión nueva, muestran **"Hay una versión nueva — Actualizar ahora"** (también en Más › Accesibilidad › Buscar actualización) y recargan sin perder la sesión.
4. `/sw.js` y `index.html` se sirven sin caché; `/_expo/static/*` y `/assets/*` con caché inmutable de 1 año (nombres con hash).
5. Seguridad: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (micrófono/cámara solo propios) y CSP en `vercel.json`. Sin Sentry/monitoreo externo configurado: el backend ya loguea JSON a stdout (Vercel Logs); agregar Sentry es opcional y no se hizo.

## 9. Probar desde un iPhone real

Hace falta HTTPS público (localhost no sirve desde el teléfono). Opciones: (a) un deploy de *preview* de Vercel (agregar su URL a `CORS_ALLOWED_ORIGINS`), o (b) un túnel (`cloudflared tunnel --url http://localhost:4173` tras `npm run serve:web --permitir-http`, apuntando el build a un backend https). Checklist: login · instalar en inicio · ícono/splash · abrir sin barra de Safari · llamar · WhatsApp (ida y vuelta) · radio (tocar ▶ y oír) · grabar y enviar mensaje de voz · asistente por voz y texto · respuesta hablada · Activar avisos y recibir un push con la app cerrada (enviarlo desde el backoffice) · teclado en el chat · rotación/notch · modo avión (debe abrir y avisar "sin conexión").

## 10. Qué se probó y qué no

Probado automáticamente (Playwright + **Chrome** con perfil/viewport iPhone 14 y Pixel 7, build de producción servido con las cabeceras de `vercel.json`, contra un servidor simulado de Supabase Auth + BFF — **no contra el Supabase/backend reales**, sin credenciales en esta sesión): carga/redirección a login, login, persistencia y recarga de sesión, 13 pantallas, 10 juegos, texto grande, ajuste de texto largo, alerta modal, `tel:`, `wa.me`, grabación y subida de audio (Pedidos, Asistente, Hablemos) con MIME correcto, foto por selector de archivos, chat del asistente (texto y voz → transcripción), lectura en voz es-*, `play()` dentro del gesto (radio y mensajes), Service Worker (registro, offline, actualización con aviso), push (evento y toque → navegación + marcar abierta), logout, viewports 320/390/430/820/1440 sin scroll horizontal, 6+ tests unitarios del backend (`WebPushProvider`).

**No probado / limitaciones de la verificación**: Safari/WebKit (no se pudo descargar WebKit en esta red) ni iPhone real — todo lo "iOS" se justifica por la documentación y por reproducir las condiciones (UA, gesto de usuario), no por haberlo visto; suscripción push real contra FCM/APNs (se simuló solo `PushManager.subscribe`; el envío con VAPID desde el backend se probó con mocks); radios reales (la red bloquea parte) y contenido mixto (se probó desde `http://localhost`); backoffice autenticado (solo carga de login a 390 y 1366 px); DNS/HTTPS de un dominio real; push con la app cerrada; teclado virtual de iOS; logout en el flujo Android+push simulado quedó con un resultado inconsistente en mi script (en el flujo iPhone sin esa simulación funciona).

## 11. Matriz funcional

✅ funciona · ⚠️ con adaptación · ❌ no disponible/limitación. "Android" = app nativa existente (no re-probada, sin cambios de comportamiento). Iphone Safari/PWA: marcado según lo probado en Chrome-emulado y la justificación técnica de §4 — **no verificado en dispositivo**.

| Funcionalidad | Android | Web | iPhone Safari | PWA |
|---|---|---|---|---|
| Login / sesión persistente | ✅ | ✅ | ✅ | ✅ |
| Registro / recuperar contraseña (residente) | ❌ no existe en la app | ❌ | ❌ | ❌ |
| Home, Horarios, Agenda, Clima | ✅ | ✅ | ✅ | ✅ |
| Llamar (`tel:`) | ✅ | ⚠️ (solo si hay telefonía) | ✅ | ✅ |
| WhatsApp | ✅ | ⚠️ `wa.me` | ⚠️ `wa.me` | ⚠️ `wa.me` |
| Contactos: importar de la libreta | ✅ | ❌ (manual) | ❌ (manual) | ❌ (manual) |
| Contactos: foto (galería/cámara) | ✅ | ⚠️ selector de archivos | ⚠️ | ⚠️ |
| Hablemos (texto/foto/audio, realtime) | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Radios | ✅ | ⚠️ solo streams https | ⚠️ solo https, tras un toque | ⚠️ ídem |
| Tutoriales / video YouTube | ✅ | ⚠️ iframe | ⚠️ | ⚠️ |
| Asistente: texto | ✅ | ✅ | ✅ | ✅ |
| Asistente: voz (micrófono) | ✅ | ⚠️ MediaRecorder + Whisper | ⚠️ HTTPS + permiso | ⚠️ permiso en cada apertura |
| Respuestas habladas (TTS) | ✅ | ⚠️ voz del navegador | ⚠️ tras 1er toque | ⚠️ |
| Juegos | ✅ | ✅ | ✅ | ✅ |
| Perfil / foto de perfil del residente | no hay en la app (se carga en backoffice) | — | — | — |
| Notificaciones push | ✅ | ⚠️ Web Push | ❌ (solo instalada) | ⚠️ sin botones de acción |
| Instalación en inicio | ✅ APK | ⚠️ (Chrome) | ⚠️ manual (Compartir) | ✅ |
| Actualización de versión | ✅ OTA | ⚠️ aviso | ⚠️ | ⚠️ |
| Offline | ⚠️ | ⚠️ solo la "cáscara" + caché de datos | ⚠️ | ⚠️ |
| Texto grande / accesibilidad | ✅ | ⚠️ adaptado | ⚠️ | ⚠️ |
| Backoffice (usuarios, roles, permisos, accesos, grupos) | — | ✅ carga y compila; permisos en backend; CRUDs no probados con datos reales | ⚠️ no probado | — |
