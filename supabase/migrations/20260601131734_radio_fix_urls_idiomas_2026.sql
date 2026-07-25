-- ─────────────────────────────────────────────────────────────────
-- 1. RENOMBRAR PAÍSES → IDIOMAS y reordenar
-- ─────────────────────────────────────────────────────────────────
UPDATE paises_radio SET nombre = 'Español', orden = 1 WHERE codigo = 'AR';
UPDATE paises_radio SET nombre = 'Hebreo',  orden = 2 WHERE codigo = 'IL';
UPDATE paises_radio SET nombre = 'Inglés',  orden = 3 WHERE codigo = 'US';

-- ─────────────────────────────────────────────────────────────────
-- 2. ARGENTINA — corregir URLs caídas
-- ─────────────────────────────────────────────────────────────────

-- La 100: CienRadios CDN caído → StreamTheWorld redirect
UPDATE radios SET
  url_stream   = 'https://playerservices.streamtheworld.com/api/livestream-redirect/FM999_56.mp3',
  url_fallback = 'https://buecrplb01.cienradios.com.ar/la100.aac'
WHERE nombre = 'La 100';

-- Radio Mitre: CienRadios CDN caído → StreamTheWorld redirect
UPDATE radios SET
  url_stream   = 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM790_56AAC.aac',
  url_fallback = 'https://buecrplb01.cienradios.com.ar/Mitre790.aac'
WHERE nombre = 'Radio Mitre';

-- Rivadavia: Alsolnet intermitente → StreamTheWorld redirect
UPDATE radios SET
  url_stream   = 'https://playerservices.streamtheworld.com/api/livestream-redirect/RIVADAVIAAAC.aac',
  url_fallback = 'https://streammax.alsolnet.com/radiorivadavia'
WHERE nombre = 'Rivadavia';

-- La Red: URL Akamai rotó → StreamTheWorld redirect
UPDATE radios SET
  url_stream   = 'https://playerservices.streamtheworld.com/api/livestream-redirect/LA_RED_AM910AAC.aac',
  url_fallback = NULL
WHERE nombre = 'La Red';

-- CNN Radio → renombrar a StreAM 950 (CNN dejó de existir dic 2025)
UPDATE radios SET
  nombre      = 'StreAM 950',
  descripcion = 'Información y entretenimiento · AM 950'
WHERE nombre = 'CNN Radio';

-- Tango Internacional: SomaFM tangonation fue eliminado → desactivar
UPDATE radios SET activo = false WHERE nombre = 'Tango Internacional';

-- ─────────────────────────────────────────────────────────────────
-- 3. ISRAEL — migrar kanliveicy → kanapi (CDN oficial actualizado)
-- ─────────────────────────────────────────────────────────────────

-- Kan Gimmel: kanliveicy falló → kanapi.media.kan.org.il (HLS oficial)
UPDATE radios SET
  url_stream   = 'https://kanapi.media.kan.org.il/Players/ByPlayer/V1/ipbc/kan-gimmel/hls-live',
  url_fallback = 'https://kanliveicy.media.kan.org.il/icy/kangimmel_mp3'
WHERE nombre = 'Kan Gimmel';

-- Kan Bet: bynetcdn inestable → kanapi Akamai CDN
UPDATE radios SET
  url_stream   = 'https://kanapi.akamaized.net/Players/ByPlayer/V1/ipbc/kan-bet/hls-live',
  url_fallback = 'https://kanbwizzlv.bynetcdn.com/kanb_mp3'
WHERE nombre = 'Kan Bet';

-- Kol HaMuzika: kanliveicy lento → kanapi Akamai CDN
UPDATE radios SET
  url_stream   = 'https://kanapi.akamaized.net/Players/ByPlayer/V1/ipbc/kan-kol-hamusica/hls-live',
  url_fallback = 'https://kanliveicy.media.kan.org.il/icy/kankolhamusica_mp3'
WHERE nombre = 'Kol HaMuzika';

-- ─────────────────────────────────────────────────────────────────
-- 4. INGLÉS — reemplazar canales SomaFM eliminados
-- ─────────────────────────────────────────────────────────────────

-- Clásica Relajante: SomaFM classicalmix eliminado → WRTI Philadelphia Classical
UPDATE radios SET
  url_stream   = 'https://wrti-live.streamguys1.com/classical-mp3',
  url_fallback = 'https://stream.wqxr.org/wqxr',
  descripcion  = 'Música clásica instrumental · WRTI Philadelphia'
WHERE nombre = 'Clásica Relajante';

-- Jazz & Blues: SomaFM somaside eliminado → WBGO Newark NPR Jazz
UPDATE radios SET
  url_stream   = 'https://ais-sa8.cdnstream1.com/3629_128.mp3',
  url_fallback = 'https://ais-sa8.cdnstream1.com/3630_128.mp3',
  descripcion  = 'Jazz y blues clásico · WBGO Newark NPR'
WHERE nombre = 'Jazz & Blues';
