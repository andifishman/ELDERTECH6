# Radio — Investigación Técnica Profunda
> Investigación realizada 2026-05-26. Leer antes de tocar cualquier cosa del sistema de radio.

## CONCLUSIÓN PRINCIPAL

**La mayoría de las "26 radios fallando" NO fallan en Android.** El testing desde Windows con Expo Web/browser tiene tres problemas que no existen en móvil:

| Problema | Windows | Android | iOS |
|---|---|---|---|
| CORS | Enforced | No existe | No existe |
| TLS/SSL (Schannel) | Cierra sin alerta en errores | Boring SSL, más tolerante | Secure Transport, más tolerante |
| Firewall puertos no-80/443 | Bloqueados en corp/office | Pasa en 4G/WiFi | Pasa en 4G/WiFi |

**Estimación real de radios que fallan en Android: 6-8 (no 26).**

**Regla de oro: siempre testear en dispositivo Android físico con 4G, nunca desde Windows.**

---

## CATEGORÍAS DE FALLO

### Categoría A — Solo fallan en Windows (NO es problema real en mobile)
Funcionarán en el dispositivo del usuario sin cambios:
- SomaFM (`ice6.somafm.com`) — SSL que falla el revocation check de Schannel
- CienRadios (`buecrplb01.cienradios.com.ar`) — mismo problema Schannel
- KAN CDN (`kanliveicy.media.kan.org.il`) — HTTPS que Schannel no tolera
- Radios en puertos no estándar (`:9270`, `:9660`) — firewall corporativo

### Categoría B — Fallan en Android también (problema REAL)
StreamTheWorld / Triton Digital — las 6 radios verdaderamente problemáticas:
- **Afectadas:** Aspen FM, Blue FM, Metro FM, Rock & Pop, AM 750, D Sports Radio
- **Por qué fallan:** La URL `playerservices.streamtheworld.com/api/livestream-redirect/MOUNT` devuelve una URL que **cambia cada sesión** (`https://[id-random].live.streamtheworld.com/MOUNT_SC`). Si guardás la URL estática, eventualmente caduca.
- **Fix correcto:** Llamar la API de provisioning en runtime, no guardar URL estática.

```
GET https://playerservices.streamtheworld.com/api/livestream-redirect/ASPENRADIO_SC
→ 302 → https://[id].live.streamtheworld.com/ASPENRADIO_SC
→ Usar esa URL dinámica con Expo AV
```

### Categoría C — Dependen de token/sesión (TuneIn)
- `opmlapi.radiotime.com/Tune.ashx?id=...` actúa como proxy con `partnerId`
- Sin partnerId = 403 después de pocos requests
- **Regla: NO usar TuneIn directamente. Buscar stream directo de cada estación.**

---

## EXPO AV vs REACT NATIVE TRACK PLAYER

**No migrar a RNTP.** Razones concretas:

| | Expo AV | RNTP v4 |
|---|---|---|
| Expo Go | ✅ Funciona | ❌ Requiere custom dev client (EAS) |
| Startup latency | Más rápido | Overhead de background service |
| HLS support | ✅ Nativo | ✅ Nativo |
| Lock screen controls | Básico | Completo |
| Complejidad | Baja | Alta |

Para una app de adultos mayores donde lo único importante es **play/stop confiable**, Expo AV es la elección correcta. RNTP solo valdría si se necesitan controles ricos en lockscreen (CarPlay, Android Auto, etc.).

---

## ARQUITECTURA ACTUAL DE `RadioContext.tsx`

- Usa `expo-av` → `Audio.Sound.createAsync`
- Headers enviados: `{ 'Icy-MetaData': '0', 'User-Agent': 'Mozilla/5.0 ...' }`
- `FALLBACK_TIMEOUT_MS = 5000` — si en 5s sigue en loading, prueba `urlFallback`
- Estrategia: `urlStream` → si falla inmediato → `urlFallback` → si sigue cargando 5s → `urlFallback`

---

## CDNs CONFIABLES (ya verificados HTTP 200)

| CDN | Radios | Protocolo | Notas |
|---|---|---|---|
| `bynetcdn.com` | Galgalatz, GLZ | Icecast MP3 | Muy estable |
| `kanliveicy.media.kan.org.il` | KAN Gimmel, Kol HaMuzika, Kan Bet | Icecast MP3 | Oficial KAN |
| `sa.mp3.icecast.magma.edge-access.net` | Radio Nacional AR y afiliadas | Icecast MP3 | RTA/Magma CDN |
| `buecrplb01.cienradios.com.ar` | Radio Mitre, La 100 | Icecast AAC | CienRadios CDN |
| `ice4/ice6.somafm.com` | ~15 canales temáticos | Icecast MP3 | Muy estable, gratis |
| `streammax.alsolnet.com` | Radio Rivadavia, otras | MP3 | Alsolnet CDN |
| `edge01.radiohdvivo.com` | Continental | MP3 | RadioHDVivo CDN |

---

## ESTADO DE LA DB (Supabase) — al 2026-05-26

**37 radios en total** (era 25 antes de la sesión de investigación).

Schema de `radios`: incluye columna `url_fallback TEXT` (agregada con ALTER TABLE).

Distribución por categoría:
- 📰 Noticias (10): NPR News, Radio 10, Radio Mitre, Radio Nacional, BBC World, CNN Radio, Continental, Cooperativa, Kan Bet, La Red
- 🎵 Música (12): Galgalatz, Kan Gimmel, La 100, 70s Radio, Aspen FM, Blue FM, Groove Salad, Metro FM, Nacional Rock, Rock & Pop, Soul Vintage, Urbana Play
- 💃 Folklore (2): Nacional Folklórica, AM 750
- 🎻 Clásica (8): Clásica Relajante, Illinois Street Lounge, Jazz & Blues, Nacional Clásica, Kol HaMuzika, Secret Agent, Sonic Universe, WQXR
- ⚽ Deportes (1): D Sports Radio
- 📻 General (1): Galei Tzahal
- 🕺 Tango (3): La 2x4, Rivadavia, Tango Internacional

---

## BUG CONOCIDO Y CORREGIDO: Galgalatz

- URL incorrecta en código: `...bynetcdn.com/galgalatz_mp3` (HTTP 404)
- URL correcta: `https://glzwizzlv.bynetcdn.com/glglz_mp3`
- Corregido en `radioService.ts` FALLBACK y en Supabase DB.

---

## BACKEND PROXY — ¿Cuándo y cómo?

Solo necesario para las 6 radios StreamTheWorld/Triton (Categoría B).

**Opción 1 — Sin infraestructura (recomendada para empezar):**
Resolver la URL de Triton en runtime desde el cliente:
```typescript
async function resolveStreamTheWorld(mount: string): Promise<string> {
  const res = await fetch(
    `https://playerservices.streamtheworld.com/api/livestream-redirect/${mount}`,
    { redirect: 'follow' }
  );
  return res.url; // URL dinámica ya resuelta
}
```
Cachear el resultado con TTL de 15 minutos.

**Opción 2 — Proxy con Cloudflare Workers (si Opción 1 no funciona):**
- Gratis, sin timeout para streaming continuo
- Supabase Edge Functions NO sirven para proxy de audio (timeout 150s idle)
- Vercel Edge sirve pero tiene límites

---

## TABLA `radio_streams` (arquitectura futura)

Propuesta para múltiple-streams-por-radio con health checks automáticos.
Schema sugerido:
```sql
CREATE TABLE radio_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  radio_id UUID REFERENCES radios(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'primary', 'fallback1', 'fallback2'
  protocolo TEXT, -- 'icecast', 'hls', 'shoutcast'
  latencia_ms INT,
  success_rate FLOAT DEFAULT 1.0,
  ultimo_check TIMESTAMPTZ,
  activo BOOLEAN DEFAULT true,
  prioridad INT DEFAULT 0
);
```
No implementado aún. Evaluar en próxima iteración si hay presupuesto/tiempo.

---

## RADIO BROWSER API

- Endpoint: `https://api.radio-browser.info/json/stations`
- Campo `urlResolved`: URL final tras resolver 301/302 y M3U/PLS
- Chequeos de salud diarios (`lastcheckok`, `lastchecktime`)
- Útil para auto-descubrir URLs directas de radios conocidas
- En producción: preferir mirrors específicos (de1, nl1, at1)

---

## PLAN DE IMPLEMENTACIÓN PENDIENTE

### Nivel 1 — Fix inmediato (2h, sin infraestructura nueva)
- [ ] Agregar función `resolveStreamTheWorld(mount)` en `radioService.ts`
- [ ] Las 6 radios Triton usan URL dinámica en lugar de URL estática hardcodeada
- [ ] Cachear resultado con React Query o AsyncStorage (TTL 15 min)

### Nivel 2 — Arquitectura intermedia (1-2 días)
- [ ] Tabla `radio_streams` en Supabase
- [ ] Supabase Edge Function para health check (ping, no proxy)
- [ ] Cron job cada 30 min para marcar streams alive/dead
- [ ] Cliente ignora streams con `lastCheckOk = false`

### Nivel 3 — Arquitectura completa (2-3 semanas)
- [ ] Cloudflare Worker proxy para StreamTheWorld
- [ ] Health checks con latency measurement real
- [ ] Auto-descubrimiento via Radio Browser API
