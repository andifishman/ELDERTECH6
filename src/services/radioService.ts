/**
 * radioService.ts
 * ───────────────
 * Servicio de radios con estrategia híbrida:
 *  1. Intenta cargar desde Supabase (fuente principal del catálogo)
 *  2. Aplica URL_OVERRIDES: correcciones de streams sin tocar la DB
 *  3. Si Supabase falla o está vacío, usa el fallback hardcodeado
 *
 * ── CDNs verificados ──────────────────────────────────────────────────────────
 *  [STW]  = StreamTheWorld/Triton (playerservices.streamtheworld.com) — redirects
 *           que resuelven dinámicamente; funcionan en Android (verificado por usuario)
 *  [R]    = RTA/Magma (sa.mp3.icecast.magma.edge-access.net) — Nacionales AR
 *  [B]    = ByNetCDN (bynetcdn.com) — radios israelíes Galei Tzahal, Galgalatz
 *  [KAN]  = KAN API (kanapi.media.kan.org.il / kanapi.akamaized.net) — Israel Broadcasting
 *  [S]    = SomaFM (somafm.com) — streams Icecast públicos, muy estables
 *  [N]    = NPR/StreamGuys (streamguys1.com) — radio pública USA
 *  [BBC]  = BBC (stream.live.vc.bbcmedia.co.uk) — stream oficial BBC
 *  [DPS]  = dps.live — CDN argentino para StreAM 950 (ex CNN Radio)
 *  [WBGO] = WBGO Jazz (ais-sa8.cdnstream1.com) — jazz NPR Newark
 *  [WRTI] = WRTI Philadelphia (wrti-live.streamguys1.com) — clásica pública USA
 *  [WQXR] = WQXR New York (stream.wqxr.org) — clásica NY
 */

import { supabase } from './supabase';
import type { RadioStation, CategoriaRadio, PaisRadio, RadioData } from '@/types/radio.types';
import { PAIS_LABELS, PAIS_FLAGS } from '@/types/radio.types';


// ─────────────────────────────────────────────────────────────────────────────
// URL overrides — se aplican sobre los datos de Supabase para corregir
// streams desactualizados sin necesidad de tocar la DB.
// Clave = nombre exacto de la radio en Supabase.
// ─────────────────────────────────────────────────────────────────────────────
const URL_OVERRIDES: Record<string, Pick<RadioStation, 'urlStream' | 'urlFallback'>> = {
  // [STW] La 100 — CienRadios CDN cambió, StreamTheWorld redirect funciona
  'La 100': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/FM999_56.mp3',
    urlFallback: 'https://buecrplb01.cienradios.com.ar/la100.aac',
  },
  // [STW] Radio Mitre — idem
  'Radio Mitre': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM790_56AAC.aac',
    urlFallback: 'https://buecrplb01.cienradios.com.ar/Mitre790.aac',
  },
  // [STW] Rivadavia — Alsolnet intermitente, StreamTheWorld más estable
  'Radio Rivadavia': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RIVADAVIAAAC.aac',
    urlFallback: 'https://streammax.alsolnet.com/radiorivadavia',
  },
  // Continental — edge01 → edge05 (hostname actualizado)
  'Radio Continental': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/CONTINENTAL_SC',
    urlFallback: 'https://edge05.radiohdvivo.com/continental',
  },
  // [STW] La Red — URL de Akamai rotó, StreamTheWorld más estable
  'La Red': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LA_RED_AM910AAC.aac',
    urlFallback: null,
  },
  // CNN Radio dejó de existir (dic 2025) → StreAM 950 en la misma frecuencia 950 AM
  'CNN Radio': {
    urlStream: 'https://unlimited2-ar.dps.live/cnn-ar/aac/icecast.audio',
    urlFallback: null,
  },
  // [KAN] Kan Gimmel — usar ICY directo que es más compatible con React Native Audio
  'Kan Gimel': {
    urlStream: 'https://kanliveicy.media.kan.org.il/icy/kangimmel_mp3',
    urlFallback: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
  },
  'Kan Gimmel': {
    urlStream: 'https://kanliveicy.media.kan.org.il/icy/kangimmel_mp3',
    urlFallback: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
  },
  // [KAN] Kan Bet — ICY directo
  'Kan Bet': {
    urlStream: 'https://kanbwizzlv.bynetcdn.com/kanb_mp3',
    urlFallback: 'https://kanliveicy.media.kan.org.il/icy/kanbet_mp3',
  },
  // [KAN] Kol HaMuzika — ICY directo
  'Kol HaMuzika': {
    urlStream: 'https://kanliveicy.media.kan.org.il/icy/kankolhamusica_mp3',
    urlFallback: null,
  },
  'Kol Hamuzika': {
    urlStream: 'https://kanliveicy.media.kan.org.il/icy/kankolhamusica_mp3',
    urlFallback: null,
  },
  // SomaFM eliminó classicalmix, somaside y tangonation → reemplazos
  'Clásica Relajante': {
    urlStream: 'https://wrti-live.streamguys1.com/classical-mp3',
    urlFallback: 'https://stream.wqxr.org/wqxr',
  },
  'Jazz & Blues': {
    urlStream: 'https://ais-sa8.cdnstream1.com/3629_128.mp3',
    urlFallback: 'https://ais-sa8.cdnstream1.com/3630_128.mp3',
  },
  'Jazz and Blues': {
    urlStream: 'https://ais-sa8.cdnstream1.com/3629_128.mp3',
    urlFallback: 'https://ais-sa8.cdnstream1.com/3630_128.mp3',
  },
  // WQXR — URL directa oficial
  'WQXR': {
    urlStream: 'https://stream.wqxr.org/wqxr',
    urlFallback: null,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Carga desde Supabase con URL overrides aplicados
// ─────────────────────────────────────────────────────────────────────────────

//carga radios, categorías y países desde supabase en paralelo
export async function getRadioData(): Promise<RadioData> {
  const [radiosRes, categoriasRes, paisesRes] = await Promise.all([
    //trae todas las radios activas con su categoría y datos del país
    supabase
      .from('radios')
      .select(`
        *,
        categoria:categorias_radio(id, nombre, emoji),
        pais_data:paises_radio(codigo, nombre, emoji_bandera)
      `)
      .eq('activo', true)
      .order('es_destacada', { ascending: false })
      .order('nombre', { ascending: true }),
    //trae las categorías activas ordenadas por campo orden
    supabase
      .from('categorias_radio')
      .select('id, nombre, emoji, orden')
      .eq('activo', true)
      .order('orden'),
    //trae los países activos ordenados por campo orden
    supabase
      .from('paises_radio')
      .select('id, codigo, nombre, emoji_bandera, orden')
      .eq('activo', true)
      .order('orden'),
  ]);

  if (radiosRes.error) throw new Error(`Error al cargar radios: ${radiosRes.error.message}`);
  if (categoriasRes.error) throw new Error(`Error al cargar categorías: ${categoriasRes.error.message}`);
  if (paisesRes.error) throw new Error(`Error al cargar países: ${paisesRes.error.message}`);

  //mapea los datos crudos de supabase al tipo RadioStation y aplica overrides
  const radios: RadioStation[] = (radiosRes.data ?? []).map((r: any) => {
    const base: RadioStation = {
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      urlStream: r.url_stream ?? '',
      urlFallback: r.url_fallback ?? null,
      urlLogo: r.url_logo,
      pais: r.pais ?? 'AR',
      paisNombre: r.pais_data?.nombre ?? PAIS_LABELS[r.pais] ?? r.pais,
      paisEmoji: r.pais_data?.emoji_bandera ?? PAIS_FLAGS[r.pais] ?? null,
      ciudad: r.ciudad,
      genero: r.genero,
      esDestacada: r.es_destacada,
      categoriaId: r.categoria?.id ?? null,
      categoria: r.categoria?.nombre ?? null,
      categoriaEmoji: r.categoria?.emoji ?? null,
    };
    // Aplicar override si existe para este nombre de radio
    const override = URL_OVERRIDES[r.nombre];
    if (override) return { ...base, ...override };
    return base;
  });

  const categorias: CategoriaRadio[] = (categoriasRes.data ?? []).map((c: any) => ({
    id: c.id,
    nombre: c.nombre,
    emoji: c.emoji,
    orden: c.orden,
  }));

  // Mapear nombres de países/idiomas a etiquetas en español del idioma
  const IDIOMA_LABELS: Record<string, string> = {
    AR: 'Español',
    IL: 'Hebreo',
    US: 'Inglés',
    GB: 'Inglés',
    ES: 'Español',
    UY: 'Español',
    MX: 'Español',
  };

  const paisesConRadios = new Set(radios.map((r) => r.pais));
  const paises: PaisRadio[] = (paisesRes.data ?? [])
    .filter((p: any) => paisesConRadios.has(p.codigo))
    .map((p: any) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: IDIOMA_LABELS[p.codigo] ?? p.nombre,
      emojiBandera: p.emoji_bandera,
      orden: p.orden,
    }));

  return { radios, categorias, paises };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback hardcodeado — catálogo completo con streams verificados
// Fuentes: gist YoSoyGena 2026, SomaFM, NPR, KAN, BBC, WBGO, WRTI
// ─────────────────────────────────────────────────────────────────────────────

export const RADIO_DATA_FALLBACK: RadioData = {
  categorias: [
    { id: 'cat-noticias',  nombre: 'Noticias',  emoji: '📰', orden: 1 },
    { id: 'cat-musica',    nombre: 'Música',    emoji: '🎵', orden: 2 },
    { id: 'cat-folklore',  nombre: 'Folklore',  emoji: '💃', orden: 3 },
    { id: 'cat-clasica',   nombre: 'Clásica',   emoji: '🎻', orden: 4 },
    { id: 'cat-deportes',  nombre: 'Deportes',  emoji: '⚽', orden: 5 },
    { id: 'cat-general',   nombre: 'General',   emoji: '📻', orden: 6 },
    { id: 'cat-tango',     nombre: 'Tango',     emoji: '🕺', orden: 7 },
  ],
  // Organizado por idioma: Español → Hebreo → Inglés
  paises: [
    { id: 'p-ar', codigo: 'AR', nombre: 'Español', emojiBandera: '🇦🇷', orden: 1 },
    { id: 'p-il', codigo: 'IL', nombre: 'Hebreo',  emojiBandera: '🇮🇱', orden: 2 },
    { id: 'p-us', codigo: 'US', nombre: 'Inglés',  emojiBandera: '🇺🇸', orden: 3 },
  ],
  radios: [

    // ═══════════════════════════════════════════════════════════════════════════
    // ESPAÑOL (AR) — Noticias
    // ═══════════════════════════════════════════════════════════════════════════

    // [R] RTA/Magma — Radio Nacional AM 870
    {
      id: 'ar-nacional',
      nombre: 'Radio Nacional',
      descripcion: 'Radio pública argentina · AM 870',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad1',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad1',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // Radio 10 — HLS directo vía stweb.tv
    {
      id: 'ar-radio10',
      nombre: 'Radio 10',
      descripcion: 'Noticias y debate · AM 710',
      urlStream: 'https://radio10.stweb.tv/radio10/live/chunks.m3u8',
      urlFallback: 'https://s6.stweb.tv/radio10/live/playlist.m3u8',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // [STW] Radio Mitre AM 790
    {
      id: 'ar-mitre',
      nombre: 'Radio Mitre',
      descripcion: 'Noticias, política y actualidad · AM 790',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM790_56AAC.aac',
      urlFallback: 'https://buecrplb01.cienradios.com.ar/Mitre790.aac',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // Continental — ELIMINADA: URLs HLS no compatibles con expo-av en React Native
    // (STW CONTINENTAL_SC y edge05 fallan en Android)

    // [STW] La Red AM 910
    {
      id: 'ar-lared',
      nombre: 'La Red',
      descripcion: 'Deportes y noticias · AM 910',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LA_RED_AM910AAC.aac',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: false,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // Radio Cooperativa AM 770
    {
      id: 'ar-cooperativa',
      nombre: 'Radio Cooperativa',
      descripcion: 'Noticias y periodismo independiente · AM 770',
      urlStream: 'https://cdn.instream.audio:9582/stream',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: false,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // [DPS] StreAM 950 (ex CNN Radio Argentina AM 950 — relanzada feb 2026)
    {
      id: 'ar-stream950',
      nombre: 'StreAM 950',
      descripcion: 'Información y entretenimiento · AM 950',
      urlStream: 'https://unlimited2-ar.dps.live/cnn-ar/aac/icecast.audio',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: false,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ESPAÑOL (AR) — Música
    // ═══════════════════════════════════════════════════════════════════════════

    // [STW] La 100 FM 99.9
    {
      id: 'ar-la100',
      nombre: 'La 100',
      descripcion: 'Los mejores hits · FM 99.9',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/FM999_56.mp3',
      urlFallback: 'https://buecrplb01.cienradios.com.ar/la100.aac',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Pop', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [STW] Aspen FM 102.3
    {
      id: 'ar-aspen',
      nombre: 'Aspen FM',
      descripcion: 'Pop y rock en inglés · FM 102.3',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/ASPEN.mp3',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Pop/Rock', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [STW] Blue FM 100.7
    {
      id: 'ar-blue',
      nombre: 'Blue FM',
      descripcion: 'Música suave y pop · FM 100.7',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/BLUE_FM_100_7AAC.aac',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Pop', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [STW] Metro FM 95.1
    {
      id: 'ar-metro',
      nombre: 'Metro FM',
      descripcion: 'Música y entretenimiento · FM 95.1',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/METRO.mp3',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Pop/Hits', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [STW] Rock & Pop FM 95.9
    {
      id: 'ar-rockpop',
      nombre: 'Rock & Pop',
      descripcion: 'Rock y pop en español · FM 95.9',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/ROCKANDPOPAAC.aac',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Rock/Pop', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [R] Nacional Rock FM 93.7
    {
      id: 'ar-nacional-rock',
      nombre: 'Nacional Rock',
      descripcion: 'Rock nacional · FM 93.7',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad39',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad39',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Rock', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // Urbana Play FM 104.3
    {
      id: 'ar-urbana',
      nombre: 'Urbana Play',
      descripcion: 'Pop, rock y actualidad · FM 104.3',
      urlStream: 'https://cdn.instream.audio:9660/stream',
      urlFallback: 'http://cdn.instream.audio:9660/stream',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Pop/Rock', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ESPAÑOL (AR) — Tango
    // ═══════════════════════════════════════════════════════════════════════════

    // La 2x4 FM 92.7 — única radio de tango del mundo, GCBA
    {
      id: 'ar-la2x4',
      nombre: 'La 2x4',
      descripcion: 'La única radio de tango del mundo · FM 92.7 · GCBA',
      urlStream: 'https://media.radios.ar:9270/stream',
      urlFallback: 'http://radios.argentina.fm:9270/stream',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Tango', esDestacada: true,
      categoriaId: 'cat-tango', categoria: 'Tango', categoriaEmoji: '🕺',
    },
    // [STW] Radio Rivadavia AM 630 — tango, folklore y nostalgia
    {
      id: 'ar-rivadavia',
      nombre: 'Radio Rivadavia',
      descripcion: 'Tango, folklore y nostalgia · AM 630',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RIVADAVIAAAC.aac',
      urlFallback: 'https://streammax.alsolnet.com/radiorivadavia',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Tango/Folklore', esDestacada: true,
      categoriaId: 'cat-tango', categoria: 'Tango', categoriaEmoji: '🕺',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ESPAÑOL (AR) — Folklore
    // ═══════════════════════════════════════════════════════════════════════════

    // [R] Nacional Folklórica FM 98.7
    {
      id: 'ar-folklorica',
      nombre: 'Nacional Folklórica',
      descripcion: 'Folklore argentino · FM 98.7',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad38',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad38',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Folklore', esDestacada: true,
      categoriaId: 'cat-folklore', categoria: 'Folklore', categoriaEmoji: '💃',
    },
    // [STW] AM 750 — radio popular, folklore y política
    {
      id: 'ar-am750',
      nombre: 'AM 750',
      descripcion: 'Folklore, cultura y política · AM 750',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM750AAC.aac',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Folklore/Noticias', esDestacada: false,
      categoriaId: 'cat-folklore', categoria: 'Folklore', categoriaEmoji: '💃',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ESPAÑOL (AR) — Clásica
    // ═══════════════════════════════════════════════════════════════════════════

    // [R] Nacional Clásica FM 96.7
    {
      id: 'ar-clasica',
      nombre: 'Nacional Clásica',
      descripcion: 'Música clásica · FM 96.7',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad37',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad37',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Clásica', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ESPAÑOL (AR) — Deportes
    // ═══════════════════════════════════════════════════════════════════════════

    // [STW] D Sports Radio FM 103.1
    {
      id: 'ar-dsports',
      nombre: 'D Sports Radio',
      descripcion: 'Deportes en vivo · FM 103.1',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/DSPORTSRADIOAAC_SC',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Español', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Deportes', esDestacada: true,
      categoriaId: 'cat-deportes', categoria: 'Deportes', categoriaEmoji: '⚽',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // HEBREO (IL)
    // ═══════════════════════════════════════════════════════════════════════════

    // [B] Galei Tzahal — radio del ejército israelí, noticias y música
    {
      id: 'il-glz',
      nombre: 'Galei Tzahal',
      descripcion: 'Radio del ejército israelí · noticias y música',
      urlStream: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
      urlFallback: 'https://glzwizzlv.bynetcdn.com/glz_aac',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Hebreo', paisEmoji: '🇮🇱',
      ciudad: 'Tel Aviv', genero: 'General', esDestacada: true,
      categoriaId: 'cat-general', categoria: 'General', categoriaEmoji: '📻',
    },
    // [B] Galgalatz — hits internacionales, la radio más escuchada de Israel
    {
      id: 'il-galgalatz',
      nombre: 'Galgalatz',
      descripcion: 'Hits internacionales y música israelí · FM 91.8',
      urlStream: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
      urlFallback: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Hebreo', paisEmoji: '🇮🇱',
      ciudad: 'Tel Aviv', genero: 'Pop', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [KAN] Kan Gimel — ELIMINADA: URL HLS KAN no compatible con expo-av en React Native
    // (kanliveicy.media.kan.org.il falla en Android)

    // [B] Kan 88 — rock, jazz y alternativo israelí
    {
      id: 'il-kan88',
      nombre: 'Kan 88',
      descripcion: 'Rock, jazz y música alternativa israelí',
      urlStream: 'https://kan88wizzlv.bynetcdn.com/kan88_mp3',
      urlFallback: 'https://kan88wizzlv.bynetcdn.com/kan88_aac',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Hebreo', paisEmoji: '🇮🇱',
      ciudad: 'Jerusalén', genero: 'Rock/Jazz', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [KAN] Kan Bet — ELIMINADA: URL HLS KAN no compatible con expo-av en React Native
    // (kanbwizzlv.bynetcdn.com y kanliveicy fallan en Android)

    // [KAN] Kol HaMuzika — ELIMINADA: URL HLS KAN no compatible con expo-av en React Native
    // (kanliveicy.media.kan.org.il/icy/kankolhamusica_mp3 falla en Android)

    // ═══════════════════════════════════════════════════════════════════════════
    // INGLÉS (US) — Noticias
    // ═══════════════════════════════════════════════════════════════════════════

    // [N] NPR News — stream oficial Icecast, muy estable
    {
      id: 'us-npr',
      nombre: 'NPR News',
      descripcion: 'Radio pública de noticias · Washington',
      urlStream: 'https://npr-ice.streamguys1.com/live.mp3',
      urlFallback: 'https://stream.npr.org/anon.npr-mp3-128',
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'Washington', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // [BBC] BBC World Service — stream oficial, ideal para adultos mayores
    {
      id: 'gb-bbc',
      nombre: 'BBC World Service',
      descripcion: 'Noticias mundiales en inglés · BBC',
      urlStream: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
      urlFallback: null,
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'Londres', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // INGLÉS (US) — Clásica
    // ═══════════════════════════════════════════════════════════════════════════

    // [WRTI] WRTI Philadelphia — clásica pública USA (reemplaza SomaFM classicalmix eliminado)
    {
      id: 'us-wrti',
      nombre: 'Clásica Relajante',
      descripcion: 'Música clásica instrumental · WRTI Philadelphia',
      urlStream: 'https://wrti-live.streamguys1.com/classical-mp3',
      urlFallback: 'https://stream.wqxr.org/wqxr',
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'Filadelfia', genero: 'Clásica', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },
    // [WQXR] WQXR New York — clásica del New York Times Radio
    {
      id: 'us-wqxr',
      nombre: 'WQXR',
      descripcion: 'Clásica de Nueva York · 105.9 FM',
      urlStream: 'https://stream.wqxr.org/wqxr',
      urlFallback: null,
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'Nueva York', genero: 'Clásica', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },
    // [S] Illinois Street Lounge — era Sinatra, lounge vintage (SomaFM)
    {
      id: 'us-soma-illstreet',
      nombre: 'Illinois Street Lounge',
      descripcion: 'Lounge vintage, era Sinatra y exotica · SomaFM',
      urlStream: 'https://ice6.somafm.com/illstreet-128-mp3',
      urlFallback: 'https://ice4.somafm.com/illstreet-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Lounge/Vintage', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // INGLÉS (US) — Música
    // ═══════════════════════════════════════════════════════════════════════════

    // [WBGO] Jazz & Blues — WBGO Newark, la mejor radio de jazz de USA (reemplaza SomaFM somaside eliminado)
    {
      id: 'us-wbgo',
      nombre: 'Jazz & Blues',
      descripcion: 'Jazz y blues clásico · WBGO Newark NPR',
      urlStream: 'https://ais-sa8.cdnstream1.com/3629_128.mp3',
      urlFallback: 'https://ais-sa8.cdnstream1.com/3630_128.mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'Newark', genero: 'Jazz', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [S] Sonic Universe — jazz ecléctico (SomaFM)
    {
      id: 'us-soma-sonicuniverse',
      nombre: 'Sonic Universe',
      descripcion: 'Jazz ecléctico y avant-garde · SomaFM',
      urlStream: 'https://ice6.somafm.com/sonicuniverse-128-mp3',
      urlFallback: 'https://ice4.somafm.com/sonicuniverse-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Jazz', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [S] Secret Agent — lounge espía estilo 007 (SomaFM)
    {
      id: 'us-soma-secret',
      nombre: 'Secret Agent',
      descripcion: 'Lounge y big band estilo 007 · SomaFM',
      urlStream: 'https://ice6.somafm.com/secretagent-128-mp3',
      urlFallback: 'https://ice4.somafm.com/secretagent-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Lounge/Spy Jazz', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [S] Soul Vintage — soul de los 50s–70s en vinyl (SomaFM)
    {
      id: 'us-soma-7soul',
      nombre: 'Soul Vintage',
      descripcion: 'Soul clásico de los 50s–70s · SomaFM',
      urlStream: 'https://ice6.somafm.com/7soul-128-mp3',
      urlFallback: 'https://ice4.somafm.com/7soul-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Soul/R&B', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [S] 70s Radio — rock melódico de los 70s (SomaFM)
    {
      id: 'us-soma-seventies',
      nombre: '70s Radio',
      descripcion: 'Rock melódico y soft rock de los 70s · SomaFM',
      urlStream: 'https://ice6.somafm.com/seventies-128-mp3',
      urlFallback: 'https://ice4.somafm.com/seventies-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Rock/70s', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [S] Groove Salad — ambient y chill out (SomaFM)
    {
      id: 'us-soma-groove',
      nombre: 'Groove Salad',
      descripcion: 'Ambient y chillout · SomaFM',
      urlStream: 'https://ice6.somafm.com/groovesalad-128-mp3',
      urlFallback: 'https://ice4.somafm.com/groovesalad-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Inglés', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Ambient', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
  ],
};
