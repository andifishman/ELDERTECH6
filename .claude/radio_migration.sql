-- ─────────────────────────────────────────────────────────────────────────────
-- Radio Migration — Actualización de streams + idiomas
-- Ejecutar en Supabase SQL Editor: https://app.supabase.com/project/[tu-project]/editor
-- Fecha: 2026-06-01
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. RENOMBRAR PAÍSES A IDIOMAS en paises_radio
-- ──────────────────────────────────────────────
UPDATE paises_radio SET nombre = 'Español' WHERE codigo = 'AR';
UPDATE paises_radio SET nombre = 'Hebreo'  WHERE codigo = 'IL';
UPDATE paises_radio SET nombre = 'Inglés'  WHERE codigo = 'US';
UPDATE paises_radio SET nombre = 'Inglés'  WHERE codigo = 'GB';

-- 2. CORREGIR URLs DE RADIOS FALLIDAS
-- ──────────────────────────────────────────────

-- La 100 → StreamTheWorld (CienRadios CDN cambió)
UPDATE radios SET
  url_stream   = 'https://playerservices.streamtheworld.com/api/livestream-redirect/FM999_56.mp3',
  url_fallback = 'https://buecrplb01.cienradios.com.ar/la100.aac'
WHERE nombre = 'La 100';

-- Radio Mitre → StreamTheWorld
UPDATE radios SET
  url_stream   = 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM790_56AAC.aac',
  url_fallback = 'https://buecrplb01.cienradios.com.ar/Mitre790.aac'
WHERE nombre = 'Radio Mitre';

-- Radio Rivadavia → StreamTheWorld (Alsolnet intermitente)
UPDATE radios SET
  url_stream   = 'https://playerservices.streamtheworld.com/api/livestream-redirect/RIVADAVIAAAC.aac',
  url_fallback = 'https://streammax.alsolnet.com/radiorivadavia'
WHERE nombre = 'Radio Rivadavia' OR nombre = 'Rivadavia';

-- Radio Continental → edge05 (hostname actualizado)
UPDATE radios SET
  url_stream   = 'https://edge05.radiohdvivo.com/continental',
  url_fallback = 'https://playerservices.streamtheworld.com/api/livestream-redirect/CONTINENTAL_SC'
WHERE nombre = 'Radio Continental' OR nombre = 'Continental';

-- La Red → StreamTheWorld (URL de Akamai rotó)
UPDATE radios SET
  url_stream   = 'https://playerservices.streamtheworld.com/api/livestream-redirect/LA_RED_AM910AAC.aac',
  url_fallback = NULL
WHERE nombre = 'La Red';

-- CNN Radio → StreAM 950 (CNN dejó de existir, relanzada como StreAM 950 feb 2026)
UPDATE radios SET
  nombre       = 'StreAM 950',
  descripcion  = 'Información y entretenimiento · AM 950',
  url_stream   = 'https://unlimited2-ar.dps.live/cnn-ar/aac/icecast.audio',
  url_fallback = NULL
WHERE nombre = 'CNN Radio' OR nombre = 'CNN Radio Argentina';

-- Kan Gimel / Kan Gimmel → kanapi.media.kan.org.il (kanliveicy falló)
UPDATE radios SET
  url_stream   = 'https://kanapi.media.kan.org.il/Players/ByPlayer/V1/ipbc/kan-gimmel/hls-live',
  url_fallback = 'https://kanliveicy.media.kan.org.il/icy/kangimmel_mp3'
WHERE nombre IN ('Kan Gimel', 'Kan Gimmel');

-- Kan Bet → kanapi Akamai (más estable que kanliveicy)
UPDATE radios SET
  url_stream   = 'https://kanapi.akamaized.net/Players/ByPlayer/V1/ipbc/kan-bet/hls-live',
  url_fallback = 'https://kanbwizzlv.bynetcdn.com/kanb_mp3'
WHERE nombre = 'Kan Bet';

-- Kol HaMuzika → kanapi Akamai
UPDATE radios SET
  url_stream   = 'https://kanapi.akamaized.net/Players/ByPlayer/V1/ipbc/kan-kol-hamusica/hls-live',
  url_fallback = 'https://kanliveicy.media.kan.org.il/icy/kankolhamusica_mp3'
WHERE nombre IN ('Kol HaMuzika', 'Kol Hamuzika');

-- Clásica Relajante → WRTI Philadelphia (SomaFM classicalmix fue eliminado)
UPDATE radios SET
  url_stream   = 'https://wrti-live.streamguys1.com/classical-mp3',
  url_fallback = 'https://stream.wqxr.org/wqxr'
WHERE nombre = 'Clásica Relajante';

-- Jazz & Blues → WBGO Newark NPR (SomaFM somaside fue eliminado)
UPDATE radios SET
  url_stream   = 'https://ais-sa8.cdnstream1.com/3629_128.mp3',
  url_fallback = 'https://ais-sa8.cdnstream1.com/3630_128.mp3'
WHERE nombre IN ('Jazz & Blues', 'Jazz and Blues');

-- WQXR → URL directa oficial
UPDATE radios SET
  url_stream   = 'https://stream.wqxr.org/wqxr',
  url_fallback = NULL
WHERE nombre = 'WQXR';

-- Tango Internacional → desactivar (SomaFM tangonation fue eliminado, sin reemplazo directo)
-- La 2x4 y Rivadavia cubren el tango en el catálogo
UPDATE radios SET activo = false
WHERE nombre = 'Tango Internacional';

-- 3. AGREGAR RADIOS FALTANTES (si no existen en la DB)
-- ──────────────────────────────────────────────
-- Obtener IDs de categorías y países antes de insertar:
-- SELECT id, nombre FROM categorias_radio;
-- SELECT id, codigo FROM paises_radio;

-- Nota: reemplazar [CAT_MUSICA_ID], [CAT_NOTICIAS_ID], etc. con los IDs reales
-- o usar subconsultas como se muestra abajo.

-- Cooperativa AM 770
INSERT INTO radios (nombre, descripcion, url_stream, url_fallback, pais, ciudad, genero, es_destacada, activo)
SELECT 'Radio Cooperativa', 'Noticias y periodismo independiente · AM 770',
       'https://cdn.instream.audio:9582/stream', NULL,
       'AR', 'Buenos Aires', 'Noticias', false, true
WHERE NOT EXISTS (SELECT 1 FROM radios WHERE nombre = 'Radio Cooperativa');

-- BBC World Service
INSERT INTO radios (nombre, descripcion, url_stream, url_fallback, pais, ciudad, genero, es_destacada, activo)
SELECT 'BBC World Service', 'Noticias mundiales en inglés · BBC',
       'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service', NULL,
       'US', 'Londres', 'Noticias', true, true
WHERE NOT EXISTS (SELECT 1 FROM radios WHERE nombre = 'BBC World Service');

-- Clásica Relajante (si no existe, crearla con WRTI)
INSERT INTO radios (nombre, descripcion, url_stream, url_fallback, pais, ciudad, genero, es_destacada, activo)
SELECT 'Clásica Relajante', 'Música clásica instrumental · WRTI Philadelphia',
       'https://wrti-live.streamguys1.com/classical-mp3', 'https://stream.wqxr.org/wqxr',
       'US', 'Filadelfia', 'Clásica', true, true
WHERE NOT EXISTS (SELECT 1 FROM radios WHERE nombre = 'Clásica Relajante');

-- Jazz & Blues (si no existe, crearla con WBGO)
INSERT INTO radios (nombre, descripcion, url_stream, url_fallback, pais, ciudad, genero, es_destacada, activo)
SELECT 'Jazz & Blues', 'Jazz y blues clásico · WBGO Newark NPR',
       'https://ais-sa8.cdnstream1.com/3629_128.mp3', 'https://ais-sa8.cdnstream1.com/3630_128.mp3',
       'US', 'Newark', 'Jazz', true, true
WHERE NOT EXISTS (SELECT 1 FROM radios WHERE nombre IN ('Jazz & Blues', 'Jazz and Blues'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VERIFICACIÓN: ver estado final de radios por idioma
-- ─────────────────────────────────────────────────────────────────────────────
SELECT r.nombre, r.pais, r.url_stream, r.activo
FROM radios r
ORDER BY r.pais, r.nombre;
