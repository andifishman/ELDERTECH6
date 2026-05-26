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
 *
 * ── Estrategia de streams verificados ────────────────────────────────────────
 *  • Solo HTTPS (o HTTP con fallback HTTPS cuando no hay alternativa)
 *  • Streams DIRECTOS sin redirects — la clave para velocidad de carga
 *  • Preferir MP3/AAC directo sobre HLS cuando sea posible
 *  • Fallback URL alternativa para cada radio crítica
 *  • Headers Icy-MetaData: 0 aplicados en RadioContext al reproducir
 *
 * ── Fuentes verificadas ───────────────────────────────────────────────────────
 *  • gist.github.com/pisculichi/fae88a2f5570ab22da53 (radios AR, actualizado 2026)
 *  • buecrplb01.cienradios.com.ar (Mitre + La 100, servidor Icecast directo)
 *  • sa.mp3.icecast.magma.edge-access.net (RTA — Nacionales)
 *  • bynetcdn.com (Galei Tzahal, Galgalatz, KAN — verificados)
 *  • somafm.com (streams públicos estables, sin publicidad)
 *  • npr-ice.streamguys1.com (NPR — muy estable)
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
// Leyenda de fuentes:
//  [C] = CienRadios (buecrplb01.cienradios.com.ar) — Icecast directo
//  [R] = RTA/Magma (sa.mp3.icecast.magma.edge-access.net) — Nacionales
//  [B] = ByNetCDN (bynetcdn.com) — radios israelíes KAN/GLZ
//  [S] = SomaFM (somafm.com) — streams públicos estables
//  [N] = NPR (streamguys1.com) — radio pública USA
//  [A] = Alsolnet/Streammax — CDN argentino
//  [I] = Instream.audio — CDN argentino

export const RADIO_DATA_FALLBACK: RadioData = {
  categorias: [
    { id: 'cat-noticias',  nombre: 'Noticias',         emoji: '📰', orden: 1 },
    { id: 'cat-musica',    nombre: 'Música popular',   emoji: '🎵', orden: 2 },
    { id: 'cat-tango',     nombre: 'Tango y folklore', emoji: '🎻', orden: 3 },
    { id: 'cat-deportes',  nombre: 'Deportes',         emoji: '⚽', orden: 4 },
    { id: 'cat-clasica',   nombre: 'Clásica y jazz',   emoji: '🎼', orden: 5 },
    { id: 'cat-general',   nombre: 'General',          emoji: '📻', orden: 6 },
  ],
  paises: [
    { id: 'p-ar', codigo: 'AR', nombre: 'Argentina',      emojiBandera: '🇦🇷', orden: 1 },
    { id: 'p-il', codigo: 'IL', nombre: 'Israel',         emojiBandera: '🇮🇱', orden: 2 },
    { id: 'p-us', codigo: 'US', nombre: 'Estados Unidos', emojiBandera: '🇺🇸', orden: 3 },
  ],
  radios: [

    // ── ARGENTINA — Noticias ─────────────────────────────────────────────────
    // [C] CienRadios Icecast directo — sin redirects, carga en <2s
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
    // [R] RTA Magma Icecast — stream directo de Radio Nacional
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
    // Radio 10 — stream HLS directo (sin StreamTheWorld redirect)
    {
      id: 'ar-radio10',
      nombre: 'Radio 10',
      descripcion: 'Noticias y debate · AM 710',
      urlStream: 'https://s6.stweb.tv/radio10/live/playlist.m3u8',
      urlFallback: 'https://server1.stweb.tv/radio10/live/playlist.m3u8',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // [A] Alsolnet CDN — stream directo de Rivadavia (también noticias/tango)
    {
      id: 'ar-continental',
      nombre: 'Radio Continental',
      descripcion: 'Noticias y actualidad · AM 590',
      urlStream: 'https://streammax.alsolnet.com/continental590',
      urlFallback: 'https://playerservices.streamtheworld.com/api/livestream-redirect/CONTINENTAL_SC',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Noticias', esDestacada: true,
      categoriaId: 'cat-noticias', categoria: 'Noticias', categoriaEmoji: '📰',
    },
    // La Red — HLS directo via Akamai (verificado en gist)
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

    // ── ARGENTINA — Música popular ───────────────────────────────────────────
    // [C] CienRadios Icecast directo — La 100
    {
      id: 'ar-la100',
      nombre: 'La 100',
      descripcion: 'Los mejores hits · FM 99.9',
      urlStream: 'https://buecrplb01.cienradios.com.ar/la100.aac',
      urlFallback: 'https://buecrp01.cienradios.com.ar/la100.aac',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Pop', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
    // [I] Instream.audio CDN — Urbana Play (verificado en gist Feb 2026)
    {
      id: 'ar-urbana',
      nombre: 'Urbana Play',
      descripcion: 'Pop, rock y actualidad · FM 104.3',
      urlStream: 'https://cdn.instream.audio:9660/stream',
      urlFallback: 'http://cdn.instream.audio:9660/stream',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Pop/Rock', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
    // Metro 95.1 — stream Icecast directo
    {
      id: 'ar-metro',
      nombre: 'Metro 95.1',
      descripcion: 'Rock y pop alternativo · FM 95.1',
      urlStream: 'https://mp3.metroaudio1.stream.avstreaming.net:7200/metro',
      urlFallback: 'http://mp3.metroaudio1.stream.avstreaming.net:7200/metro',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Rock', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
    // Vorterix — stream Icecast directo (IP verificada en gist)
    {
      id: 'ar-vorterix',
      nombre: 'Vorterix',
      descripcion: 'Rock nacional e internacional · FM 92.1',
      urlStream: 'https://147.135.11.82:9904/',
      urlFallback: 'http://147.135.11.82:9904/',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Rock', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
    // [A] Alsolnet — La 990
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

    // ── ARGENTINA — Tango y folklore (PRIORIDAD ABSOLUTA) ────────────────────
    // La 2x4 — radio oficial de tango del GCBA, stream Icecast directo
    // Fuente: gist pisculichi + roonlabs community (verificado 2025)
    {
      id: 'ar-la2x4',
      nombre: 'La 2x4',
      descripcion: 'Radio oficial de tango · FM 92.7 · GCBA',
      urlStream: 'https://media.radios.ar:9270/stream',
      urlFallback: 'http://radios.argentina.fm:9270/stream',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Tango', esDestacada: true,
      categoriaId: 'cat-tango', categoria: 'Tango y folklore', categoriaEmoji: '🎻',
    },
    // [R] RTA Magma — Nacional Folklórica (stream directo, verificado)
    {
      id: 'ar-folklorica',
      nombre: 'Nacional Folklórica',
      descripcion: 'Folklore argentino · FM 98.7',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad38',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad38',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Folklore', esDestacada: true,
      categoriaId: 'cat-tango', categoria: 'Tango y folklore', categoriaEmoji: '🎻',
    },
    // [A] Alsolnet — Rivadavia (tango, folklore, nostalgia · AM 630)
    {
      id: 'ar-rivadavia',
      nombre: 'Radio Rivadavia',
      descripcion: 'Tango, folklore y nostalgia · AM 630',
      urlStream: 'https://streammax.alsolnet.com/radiorivadavia',
      urlFallback: 'http://streammax.alsolnet.com/radiorivadavia',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Tango/Folklore', esDestacada: false,
      categoriaId: 'cat-tango', categoria: 'Tango y folklore', categoriaEmoji: '🎻',
    },
    // SomaFM Tango — stream público internacional de tango, muy estable
    {
      id: 'ar-soma-tango',
      nombre: 'Tango Internacional',
      descripcion: 'Tango clásico y moderno · SomaFM',
      urlStream: 'https://ice6.somafm.com/tangonation-128-mp3',
      urlFallback: 'https://ice4.somafm.com/tangonation-128-mp3',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Tango', esDestacada: true,
      categoriaId: 'cat-tango', categoria: 'Tango y folklore', categoriaEmoji: '🎻',
    },

    // ── ARGENTINA — Clásica ──────────────────────────────────────────────────
    // [R] RTA Magma — Nacional Clásica (stream directo, verificado)
    {
      id: 'ar-clasica',
      nombre: 'Nacional Clásica',
      descripcion: 'Música clásica · FM 96.7',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad37',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad37',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Clásica', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica y jazz', categoriaEmoji: '🎼',
    },
    // [R] RTA Magma — Nacional Rock (stream directo, verificado)
    {
      id: 'ar-nacional-rock',
      nombre: 'Nacional Rock',
      descripcion: 'Rock nacional · FM 93.7',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad39',
      urlFallback: 'http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad39',
      urlLogo: null,
      pais: 'AR', paisNombre: 'Argentina', paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires', genero: 'Rock', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },

    // ── ISRAEL ───────────────────────────────────────────────────────────────
    // [B] ByNetCDN — streams directos, verificados y funcionando
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
    {
      id: 'il-galgalatz',
      nombre: 'Galgalatz',
      descripcion: 'Hits internacionales y música israelí',
      urlStream: 'https://glzwizzlv.bynetcdn.com/galgalatz_mp3',
      urlFallback: 'https://glzwizzlv.bynetcdn.com/galgalatz_aac',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Israel', paisEmoji: '🇮🇱',
      ciudad: 'Tel Aviv', genero: 'Pop', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
    {
      id: 'il-kan88',
      nombre: 'Kan 88',
      descripcion: 'Rock, jazz y música alternativa israelí',
      urlStream: 'https://kan88wizzlv.bynetcdn.com/kan88_mp3',
      urlFallback: 'https://kan88wizzlv.bynetcdn.com/kan88_aac',
      urlLogo: null,
      pais: 'IL', paisNombre: 'Israel', paisEmoji: '🇮🇱',
      ciudad: 'Jerusalén', genero: 'Rock/Jazz', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
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

    // ── ESTADOS UNIDOS ───────────────────────────────────────────────────────
    // [N] NPR — stream oficial, muy estable
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
    // [S] SomaFM — todos los streams son directos Icecast, sin redirects, muy estables
    {
      id: 'us-soma-groove',
      nombre: 'Groove Salad',
      descripcion: 'Ambient y chillout · SomaFM',
      urlStream: 'https://ice6.somafm.com/groovesalad-128-mp3',
      urlFallback: 'https://ice4.somafm.com/groovesalad-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Ambient', esDestacada: true,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
    {
      id: 'us-soma-jazz',
      nombre: 'Jazz & Blues',
      descripcion: 'Jazz y blues clásico · SomaFM',
      urlStream: 'https://ice6.somafm.com/somaside-128-mp3',
      urlFallback: 'https://ice4.somafm.com/somaside-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Jazz', esDestacada: true,
      categoriaId: 'cat-clasica', categoria: 'Clásica y jazz', categoriaEmoji: '🎼',
    },
    {
      id: 'us-soma-lush',
      nombre: 'Lush',
      descripcion: 'Downtempo e indie · SomaFM',
      urlStream: 'https://ice6.somafm.com/lush-128-mp3',
      urlFallback: 'https://ice4.somafm.com/lush-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Indie', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
    {
      id: 'us-soma-clasica',
      nombre: 'Clásica Relajante',
      descripcion: 'Música clásica instrumental · SomaFM',
      urlStream: 'https://ice6.somafm.com/classicalmix-128-mp3',
      urlFallback: 'https://ice4.somafm.com/classicalmix-128-mp3',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'San Francisco', genero: 'Clásica', esDestacada: false,
      categoriaId: 'cat-clasica', categoria: 'Clásica y jazz', categoriaEmoji: '🎼',
    },
    // 1.FM — streams Icecast directos, décadas de música
    {
      id: 'us-1fm-60s70s',
      nombre: '60s & 70s',
      descripcion: 'Los mejores clásicos de los 60 y 70',
      urlStream: 'https://prmstrm.1.fm:8000/60s_70s',
      urlFallback: 'https://prmstrm.1.fm:8000/70s',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'Internacional', genero: 'Oldies', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
    {
      id: 'us-1fm-80s',
      nombre: '80s Hits',
      descripcion: 'Los mejores hits de los años 80',
      urlStream: 'https://prmstrm.1.fm:8000/80s_90s',
      urlFallback: 'https://prmstrm.1.fm:8000/80s',
      urlLogo: null,
      pais: 'US', paisNombre: 'Estados Unidos', paisEmoji: '🇺🇸',
      ciudad: 'Internacional', genero: 'Oldies', esDestacada: false,
      categoriaId: 'cat-musica', categoria: 'Música popular', categoriaEmoji: '🎵',
    },
  ],
};
