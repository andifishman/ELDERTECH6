import { supabase } from './supabase';
import type { RadioStation, CategoriaRadio, PaisRadio, RadioData } from '@/types/radio.types';
import { PAIS_LABELS, PAIS_FLAGS } from '@/types/radio.types';

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

  // Solo mostrar países que tienen al menos una radio activa
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

export const RADIO_DATA_FALLBACK: RadioData = {
  radios: [
    {
      id: 'f-1',
      nombre: 'Radio Mitre',
      descripcion: 'Noticias, política y actualidad — AM 790',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM790_56AAC.aac',
      urlLogo: null,
      pais: 'AR',
      paisNombre: 'Argentina',
      paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires',
      genero: 'Noticias',
      esDestacada: true,
      categoriaId: null,
      categoria: 'Noticias',
      categoriaEmoji: '📰',
    },
    {
      id: 'f-2',
      nombre: 'Radio Nacional',
      descripcion: 'Radio pública argentina — AM 870',
      urlStream: 'https://sa.mp3.icecast.magma.edge-access.net/sc_rad1',
      urlLogo: null,
      pais: 'AR',
      paisNombre: 'Argentina',
      paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires',
      genero: 'Noticias',
      esDestacada: true,
      categoriaId: null,
      categoria: 'Noticias',
      categoriaEmoji: '📰',
    },
    {
      id: 'f-3',
      nombre: 'La 100',
      descripcion: 'Los mejores hits — FM 99.9',
      urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/FM999_56.mp3',
      urlLogo: null,
      pais: 'AR',
      paisNombre: 'Argentina',
      paisEmoji: '🇦🇷',
      ciudad: 'Buenos Aires',
      genero: 'Pop',
      esDestacada: true,
      categoriaId: null,
      categoria: 'Música popular',
      categoriaEmoji: '🎵',
    },
    {
      id: 'f-4',
      nombre: 'Galei Tzahal',
      descripcion: 'Radio israelí en vivo',
      urlStream: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
      urlLogo: null,
      pais: 'IL',
      paisNombre: 'Israel',
      paisEmoji: '🇮🇱',
      ciudad: 'Tel Aviv',
      genero: 'General',
      esDestacada: true,
      categoriaId: null,
      categoria: 'General',
      categoriaEmoji: '📻',
    },
    {
      id: 'f-5',
      nombre: 'NPR News',
      descripcion: 'Radio pública de Estados Unidos',
      urlStream: 'https://npr-ice.streamguys1.com/live.mp3',
      urlLogo: null,
      pais: 'US',
      paisNombre: 'Estados Unidos',
      paisEmoji: '🇺🇸',
      ciudad: 'Washington',
      genero: 'Noticias',
      esDestacada: true,
      categoriaId: null,
      categoria: 'Noticias',
      categoriaEmoji: '📰',
    },
  ],
  categorias: [],
  paises: [],
};
