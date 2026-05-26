/**
 * radioService.ts
 * ───────────────
 * Servicio de radios con estrategia híbrida:
 *  1. Intenta cargar desde Supabase (fuente principal)
 *  2. Si falla o está vacío, usa el fallback hardcodeado con streams verificados
 *
 * ── Por qué fallan muchas radios ──────────────────────────────────────────────
 *  • StreamTheWorld redirect: hace 2-3 redirects HTTP antes del stream real.
 *    Expo AV en Android tiene un bug conocido con redirects encadenados —
 *    puede tardar 10-15 segundos o fallar silenciosamente.
 *  • Zeno.fm IDs: son IDs de estación que también hacen redirects internos.
 *    Funcionan en web pero en React Native nativo son lentos e inestables.
 *  • URLs HTTP: Android bloquea tráfico cleartext por defecto.
 *  • Protocolo ICY: Icecast/SHOUTcast responden "ICY 200 OK" en vez de HTTP
 *    estándar. Expo Audio necesita el header `Icy-MetaData: 0` para forzar HTTP/1.1
 *  • Puertos no estándar (9270, 9660, 8000): algunos firewalls los bloquean,
 *    pero funcionan correctamente en redes móviles (4G/5G).
 *
 * ── Estrategia de streams verificados ────────────────────────────────────────
 *  • Solo HTTPS (o HTTP con fallback HTTPS cuando no hay alternativa)
 *  • Streams DIRECTOS sin redirects — la clave para velocidad de carga
 *  • Preferir MP3/AAC directo sobre HLS cuando sea posible
 *  • Fallback URL alternativa para cada radio crítica
 *  • Headers Icy-MetaData: 0 aplicados en RadioContext al reproducir
 *
 * ── CDNs verificados ──────────────────────────────────────────────────────────
 *  [C] = CienRadios (buecrplb01.cienradios.com.ar) — Icecast directo AAC
 *  [R] = RTA/Magma (sa.mp3.icecast.magma.edge-access.net) — Nacionales AR
 *  [B] = ByNetCDN (bynetcdn.com) — radios israelíes KAN/GLZ
 *  [K] = KAN CDN oficial (kanliveicy.media.kan.org.il) — Israel Broadcasting
 *  [S] = SomaFM (somafm.com) — streams públicos Icecast, muy estables
 *  [N] = NPR (streamguys1.com) — radio pública USA
 *  [A] = Alsolnet/Streammax (alsolnet.com) — CDN argentino
 *  [H] = RadioHDVivo (radiohdvivo.com) — CDN argentino
 */

import { supabase } from './supabase';
import type { RadioStation, CategoriaRadio, PaisRadio, RadioData } from '@/types/radio.types';
import { PAIS_LABELS, PAIS_FLAGS } from '@/types/radio.types';

// ─────────────────────────────────────────────────────────────────────────────
// Carga desde Supabase
// ─────────────────────────────────────────────────────────────────────────────

export async function getRadioData(): Promise<RadioData> {
  const [radiosRes, categoriasRes, paisesRes] = await Promise.all([
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
    supabase
      .from('categorias_radio')
      .select('id, nombre, emoji, orden')
      .eq('activo', true)
      .order('orden'),
    supabase
      .from('paises_radio')
      .select('id, codigo, nombre, emoji_bandera, orden')
      .eq('activo', true)
      .order('orden'),
  ]);

  if (radiosRes.error) throw new Error(`Error al cargar radios: ${radiosRes.error.message}`);
  if (categoriasRes.error) throw new Error(`Error al cargar categorías: ${categoriasRes.error.message}`);
  if (paisesRes.error) throw new Error(`Error al cargar países: ${paisesRes.error.message}`);

  const radios: RadioStation[] = (radiosRes.data ?? []).map((r: any) => ({
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
  }));

  const categorias: CategoriaRadio[] = (categoriasRes.data ?? []).map((c: any) => ({
    id: c.id,
    nombre: c.nombre,
    emoji: c.emoji,
    orden: c.orden,
  }));

  const paisesConRadios = new Set(radios.map((r) => r.pais));
  const paises: PaisRadio[] = (paisesRes.data ?? [])
    .filter((p: any) => paisesConRadios.has(p.codigo))
    .map((p: any) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      emojiBandera: p.emoji_bandera,
      orden: p.orden,
    }));

  return { radios, categorias, paises };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback hardcodeado — streams DIRECTOS verificados
// ─────────────────────────────────────────────────────────────────────────────
//
// REGLA PRINCIPAL: Solo streams directos sin redirects encadenados.
// Esto es lo que diferencia las radios que cargan en <2s de las que tardan 10s+.
//
// Fuentes de verificación usadas (mayo 2026):
//  - gist.github.com/pisculichi/fae88a2f5570ab22da53
//  - gist.github.com/YoSoyGena/7f3a225f39e98d5ac988e1af1526fdc4 (actualizado 2026)
//  - somafm.com/listen/ (streams directos oficiales)
//  - github.com/yuvadm/streams (radios israelíes)
//  - curl -sI --max-time 5 <url> (test HTTP 200)

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
  paises: [
    { id: 'p-ar', codigo: 'AR', nombre: 'Argentina',      emojiBandera: '🇦🇷', orden: 1 },
    { id: 'p-il', codigo: 'IL', nombre: 'Israel',         emojiBandera: '🇮🇱', orden: 2 },
    { id: 'p-us', codigo: 'US', nombre: 'Estados Unidos', emojiBandera: '🇺🇸', orden: 3 },
  ],
  radios: [

    // ═══════════════════════════════════════════════════════════════════════════
    // ARGENTINA — Noticias
    // ═══════════════════════════════════════════════════════════════════════════

    // [C] CienRadios Icecast directo AAC — sin redirects, carga en <2s
    {
      id: 'ar-mitre',
      nombre: 'Radio Mitre',
      descripcion: 'Noticias, política y actualidad · AM 790',
      urlStream: 'https://buecrplb01.cienradios.com.ar/Mitre790.aac',
      urlFallback: 'https://buecrp01.cienradios.com.ar/Mitre790.aac',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // [R] RTA/Magma Icecast — stream directo Radio Nacional
    {
      id: 'ar-nacional',
      nombre: 'Radio Nacional',
      descripcion: 'Radio pública argentina · AM 870',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad1',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad1',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // Radio 10 — HLS directo vía stweb.tv (2026: nuevo hostname radio10.stweb.tv)
    {
      id: 'ar-radio10',
      nombre: 'Radio 10',
      descripcion: 'Noticias y debate · AM 710',
      urlStream: 'https://radio10.stweb.tv/radio10/live/chunks.m3u8',
      urlFallback: 'https://s6.stweb.tv/radio10/live/playlist.m3u8',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // [H] RadioHDVivo CDN — Continental AM 590 (fuente: gist YoSoyGena 2026)
    {
      id: 'ar-continental',
      nombre: 'Radio Continental',
      descripcion: 'Noticias y actualidad · AM 590',
      urlStream: 'https://edge01.radiohdvivo.com/continental',
      urlFallback: 'https://streammax.alsolnet.com/continental590',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // [A] Alsolnet — La 990 AM
    {
      id: 'ar-la990',
      nombre: 'La 990',
      descripcion: 'Noticias y entretenimiento · AM 990',
      urlStream: 'https://streamten.alsolnet.com/la990',
      urlFallback: null,
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: false,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ARGENTINA — Música popular
    // ═══════════════════════════════════════════════════════════════════════════

    // [C] CienRadios Icecast directo AAC — La 100
    {
      id: 'ar-la100',
      nombre: 'La 100',
      descripcion: 'Los mejores hits · FM 99.9',
      urlStream: 'https://buecrplb01.cienradios.com.ar/la100.aac',
      urlFallback: 'https://buecrp01.cienradios.com.ar/la100.aac',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Pop', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // Urbana Play — CDN instream.audio puerto 9660
    // Puerto 9660 puede estar bloqueado en firewalls corporativos, funciona en 4G/5G
    {
      id: 'ar-urbana',
      nombre: 'Urbana Play',
      descripcion: 'Pop, rock y actualidad · FM 104.3',
      urlStream: 'https://cdn.instream.audio:9660/stream',
      urlFallback: 'http://cdn.instream.audio:9660/stream',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Pop/Rock', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // [R] RTA/Magma — Nacional Rock FM 93.7 (stream directo, verificado)
    {
      id: 'ar-nacional-rock',
      nombre: 'Nacional Rock',
      descripcion: 'Rock nacional · FM 93.7',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad39',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad39',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Rock', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ARGENTINA — Tango y folklore (PRIORIDAD ABSOLUTA)
    // ═══════════════════════════════════════════════════════════════════════════

    // La 2x4 — única radio del mundo dedicada íntegramente al tango · GCBA
    // Puerto 9270 — funciona en redes móviles (4G/5G), puede estar bloqueado
    // en firewalls corporativos. Fuente: gist pisculichi + buenosaires.gob.ar
    {
      id: 'ar-la2x4',
      nombre: 'La 2x4',
      descripcion: 'La única radio de tango del mundo · FM 92.7 · GCBA',
      urlStream: 'https://media.radios.ar:9270/stream',
      urlFallback: 'http://radios.argentina.fm:9270/stream',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Tango', esDestacada: true,
      categoriaId: 'cat-tango', categoria: 'Tango', categoriaEmoji: '🕺',
    },
    // [S] SomaFM TangoNation — tango internacional verificado, carga en <1s
    {
      id: 'ar-soma-tango',
      nombre: 'Tango Internacional',
      descripcion: 'Tango clásico y moderno · SomaFM',
      urlStream: 'https://ice6.somafm.com/tangonation-128-mp3',
      urlFallback: 'https://ice4.somafm.com/tangonation-128-mp3',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Internacional', genero: 'Tango', esDestacada: true,
      categoriaId: 'cat-tango', categoria: 'Tango', categoriaEmoji: '🕺',
    },
    // [A] Alsolnet — Radio Rivadavia AM 630 (tango, folklore, nostalgia)
    {
      id: 'ar-rivadavia',
      nombre: 'Radio Rivadavia',
      descripcion: 'Tango, folklore y nostalgia · AM 630',
      urlStream: 'https://streammax.alsolnet.com/radiorivadavia',
      urlFallback: 'http://streammax.alsolnet.com/radiorivadavia',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Tango/Folklore', esDestacada: true,
      categoriaId: 'cat-tango', categoria: 'Tango', categoriaEmoji: '🕺',
    },
    // [R] RTA/Magma — Nacional Folklórica FM 98.7 (stream directo, verificado)
    {
      id: 'ar-folklorica',
      nombre: 'Nacional Folklórica',
      descripcion: 'Folklore argentino · FM 98.7',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad38',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad38',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Folklore', esDestacada: true,
      categoriaId: 'cat-folklore', categoria: 'Folklore', categoriaEmoji: '💃',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ARGENTINA — Clásica
    // ═══════════════════════════════════════════════════════════════════════════

    // [R] RTA/Magma — Nacional Clásica FM 96.7 (stream directo, verificado)
    {
      id: 'ar-clasica',
      nombre: 'Nacional Clásica',
      descripcion: 'Música clásica · FM 96.7',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad37',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad37',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Clásica', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ARGENTINA — Deportes
    // ═══════════════════════════════════════════════════════════════════════════

    // La Red — HLS Akamai directo (AM 910, deportes y noticias)
    {
      id: 'ar-lared',
      nombre: 'La Red',
      descripcion: 'Deportes y noticias · AM 910',
      urlStream: 'https://strive-sdn-lsdlive-live.akamaized.net/live_passthrough_static/amlared/playlist/manifest/gotardisz/audio/1770918776/livestream1.m3u8',
      urlFallback: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LARED_SC',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Deportes', esDestacada: false,
      categoriaId: 'cat-deportes', categoria: 'Deportes', categoriaEmoji: '⚽',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ISRAEL
    // ═══════════════════════════════════════════════════════════════════════════

    // [B] ByNetCDN — streams HTTPS directos MP3, HTTP 200 verificado
    {
      id: 'il-glz',
      nombre: 'Galei Tzahal',
      descripcion: 'Radio del ejército israelí · noticias y música',
      urlStream: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
      urlFallback: 'https://glzwizzlv.bynetcdn.com/glz_aac',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Israel', paisEmoji: '🇮🇱',
      ciudad: 'Tel Aviv', genero: 'General', esDestacada: true,
      categoriaId: 'cat-general', categoria: 'General', categoriaEmoji: '📻',
    },
    // CORRECCIÓN: URL correcta es glglz_mp3 (no galgalatz_mp3 — da HTTP 404)
    {
      id: 'il-galgalatz',
      nombre: 'Galgalatz',
      descripcion: 'Hits internacionales y música israelí · FM 91.8',
      urlStream: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
      urlFallback: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Israel', paisEmoji: '🇮🇱',
      ciudad: 'Tel Aviv', genero: 'Pop', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // Kan Gimel — primera radio israelí dedicada exclusivamente a música hebrea
    // CDN oficial KAN como primario; ByNetCDN (Kan 88) como fallback
    {
      id: 'il-kan-gimel',
      nombre: 'Kan Gimel',
      descripcion: 'Música hebrea israelí · KAN',
      urlStream: 'https://kanliveicy.media.kan.org.il/icy/kangimmel_mp3',
      urlFallback: 'https://kan88wizzlv.bynetcdn.com/kan88_mp3',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Israel', paisEmoji: '🇮🇱',
      ciudad: 'Jerusalén', genero: 'Música israelí', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // Kan 88 — rock, jazz y alternativo israelí
    {
      id: 'il-kan88',
      nombre: 'Kan 88',
      descripcion: 'Rock, jazz y música alternativa israelí',
      urlStream: 'https://kan88wizzlv.bynetcdn.com/kan88_mp3',
      urlFallback: 'https://kan88wizzlv.bynetcdn.com/kan88_aac',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Israel', paisEmoji: '🇮🇱',
      ciudad: 'Jerusalén', genero: 'Rock/Jazz', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // Kan Bet — noticias y actualidad en hebreo
    {
      id: 'il-kan-bet',
      nombre: 'Kan Bet',
      descripcion: 'Noticias y actualidad en hebreo',
      urlStream: 'https://kanbwizzlv.bynetcdn.com/kanb_mp3',
      urlFallback: 'https://kanbwizzlv.bynetcdn.com/kanb_aac',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Israel', paisEmoji: '🇮🇱',
      ciudad: 'Jerusalén', genero: 'Noticias', esDestacada: false,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // Kol HaMuzika — canal de música clásica y orquestal del servicio público KAN
    {
      id: 'il-kol-hamusica',
      nombre: 'Kol HaMuzika',
      descripcion: 'Música clásica y orquestal · KAN',
      urlStream: 'https://kanliveicy.media.kan.org.il/icy/kankolhamusica_mp3',
      urlFallback: null,
      urlLogo: null,
      pais: 'IL', paisNombre: 'Israel', paisEmoji: '🇮🇱',
      ciudad: 'Jerusalén', genero: 'Clásica', esDestacada: false,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },
    // Kan Reka — radio en árabe, servicio público israelí
    {
      id: 'il-reka',
      nombre: 'Kan Reka',
      descripcion: 'Radio en árabe · KAN',
      urlStream: 'https://rekawizzlv.bynetcdn.com/reka_mp3',
      urlFallback: 'https://rekawizzlv.bynetcdn.com/reka_aac',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Israel', paisEmoji: '🇮🇱',
      ciudad: 'Jerusalén', genero: 'General', esDestacada: false,
      categoriaId: 'cat-general', categoria: 'General', categoriaEmoji: '📻',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ESTADOS UNIDOS
    // ═══════════════════════════════════════════════════════════════════════════

    // [N] NPR — stream oficial Icecast, muy estable
    {
      id: 'us-npr',
      nombre: 'NPR News',
      descripcion: 'Radio pública de noticias · Washington',
      urlStream: 'https://npr-ice.streamguys1.com/live.mp3',
      urlFallback: 'https://stream.npr.org/anon.npr-mp3-128',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'Washington', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // [S] SomaFM — todos los streams son Icecast directo, sin redirects, muy estables
    // Illinois Street Lounge — era Sinatra, lounge vintage, exotica (ideal adultos mayores)
    {
      id: 'us-soma-illstreet',
      nombre: 'Illinois Street Lounge',
      descripcion: 'Lounge vintage, era Sinatra y exotica · SomaFM',
      urlStream: 'https://ice6.somafm.com/illstreet-128-mp3',
      urlFallback: 'https://ice4.somafm.com/illstreet-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Lounge/Vintage', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },
    // Jazz & Blues — jazz y blues clásico
    {
      id: 'us-soma-jazz',
      nombre: 'Jazz & Blues',
      descripcion: 'Jazz y blues clásico · SomaFM',
      urlStream: 'https://ice6.somafm.com/somaside-128-mp3',
      urlFallback: 'https://ice4.somafm.com/somaside-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Jazz', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },
    // Clásica Relajante — música clásica instrumental
    {
      id: 'us-soma-clasica',
      nombre: 'Clásica Relajante',
      descripcion: 'Música clásica instrumental · SomaFM',
      urlStream: 'https://ice6.somafm.com/classicalmix-128-mp3',
      urlFallback: 'https://ice4.somafm.com/classicalmix-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Clásica', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },
    // Sonic Universe — jazz ecléctico y avant-garde
    {
      id: 'us-soma-sonicuniverse',
      nombre: 'Sonic Universe',
      descripcion: 'Jazz ecléctico · SomaFM',
      urlStream: 'https://ice6.somafm.com/sonicuniverse-128-mp3',
      urlFallback: 'https://ice4.somafm.com/sonicuniverse-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Jazz', esDestacada: false,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },
    // Secret Agent — lounge espía estilo 007, big band de los 60s
    {
      id: 'us-soma-secret',
      nombre: 'Secret Agent',
      descripcion: 'Lounge y big band estilo 007 · SomaFM',
      urlStream: 'https://ice6.somafm.com/secretagent-128-mp3',
      urlFallback: 'https://ice4.somafm.com/secretagent-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Lounge/Spy Jazz', esDestacada: false,
      categoriaId: 'cat-clasica', categoria: 'Clásica', categoriaEmoji: '🎻',
    },
    // Seven Inch Soul — soul vintage de los 50s–70s en discos 45 RPM originales
    {
      id: 'us-soma-7soul',
      nombre: 'Soul Vintage',
      descripcion: 'Soul clásico de los 50s–70s en vinyl · SomaFM',
      urlStream: 'https://ice6.somafm.com/7soul-128-mp3',
      urlFallback: 'https://ice4.somafm.com/7soul-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Soul/R&B', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // Left Coast 70s — rock melódico de los 70s
    {
      id: 'us-soma-seventies',
      nombre: '70s Radio',
      descripcion: 'Rock melódico y soft rock de los 70s · SomaFM',
      urlStream: 'https://ice6.somafm.com/seventies-128-mp3',
      urlFallback: 'https://ice4.somafm.com/seventies-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Rock/70s', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
    // Groove Salad — ambient y chill out
    {
      id: 'us-soma-groove',
      nombre: 'Groove Salad',
      descripcion: 'Ambient y chillout · SomaFM',
      urlStream: 'https://ice6.somafm.com/groovesalad-128-mp3',
      urlFallback: 'https://ice4.somafm.com/groovesalad-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Ambient', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música', categoriaEmoji: '🎵',
    },
  ],
};
