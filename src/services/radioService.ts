import { supabase } from './supabase';
import type { RadioStation, RadioGroup } from '@/types/radio.types';
import { PAIS_LABELS } from '@/types/radio.types';

/**
 * Trae todas las radios activas agrupadas por país.
 * Primero las destacadas, luego el resto.
 */
export async function getRadios(): Promise<RadioGroup[]> {
  const { data, error } = await supabase
    .from('radios')
    .select(`
      *,
      categoria:categorias_radio(nombre, emoji)
    `)
    .eq('activo', true)
    .order('es_destacada', { ascending: false })
    .order('nombre', { ascending: true });

  if (error) throw new Error(`Error al cargar radios: ${error.message}`);

  const radios: RadioStation[] = (data ?? []).map((r: any) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    urlStream: r.url_stream ?? '',
    urlLogo: r.url_logo,
    pais: r.pais ?? 'AR',
    ciudad: r.ciudad,
    genero: r.genero,
    esDestacada: r.es_destacada,
    categoria: r.categoria?.nombre ?? null,
    categoriaEmoji: r.categoria?.emoji ?? null,
  }));

  // Agrupar por país, manteniendo el orden de primera aparición
  const mapa = new Map<string, RadioStation[]>();
  for (const radio of radios) {
    if (!mapa.has(radio.pais)) mapa.set(radio.pais, []);
    mapa.get(radio.pais)!.push(radio);
  }

  return Array.from(mapa.entries()).map(([pais, items]) => ({
    pais,
    paisLabel: PAIS_LABELS[pais] ?? pais,
    radios: items,
  }));
}

/** Radios de fallback hardcodeadas para desarrollo sin Supabase */
export const RADIOS_FALLBACK: RadioGroup[] = [
  {
    pais: 'AR',
    paisLabel: 'Argentina',
    radios: [
      {
        id: '1',
        nombre: 'Radio Mitre',
        descripcion: 'Radio de noticias y actualidad',
        urlStream: 'https://17923.live.streamtheworld.com/MITRE.mp3',
        urlLogo: null,
        pais: 'AR',
        ciudad: 'Buenos Aires',
        genero: 'Noticias / Actualidad',
        esDestacada: true,
        categoria: 'Noticias',
        categoriaEmoji: '📰',
      },
      {
        id: '2',
        nombre: 'La 100',
        descripcion: 'Los mejores hits',
        urlStream: 'https://17953.live.streamtheworld.com/LA100.mp3',
        urlLogo: null,
        pais: 'AR',
        ciudad: 'Buenos Aires',
        genero: 'Pop',
        esDestacada: true,
        categoria: 'Música popular',
        categoriaEmoji: '🎵',
      },
      {
        id: '3',
        nombre: 'Radio Nacional',
        descripcion: 'Radio pública argentina',
        urlStream: 'https://stream.radionacional.com.ar/radio-nacional-am870-lrar',
        urlLogo: null,
        pais: 'AR',
        ciudad: 'Buenos Aires',
        genero: 'General',
        esDestacada: true,
        categoria: 'General',
        categoriaEmoji: '📻',
      },
    ],
  },
  {
    pais: 'IL',
    paisLabel: 'Israel',
    radios: [
      {
        id: '4',
        nombre: 'Galatz',
        descripcion: 'Radio del ejército israelí',
        urlStream: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
        urlLogo: null,
        pais: 'IL',
        ciudad: 'Tel Aviv',
        genero: 'Pop / Noticias',
        esDestacada: false,
        categoria: 'General',
        categoriaEmoji: '📻',
      },
      {
        id: '5',
        nombre: 'Reshet Bet',
        descripcion: 'Noticias y cultura israelí',
        urlStream: 'https://radioapp.bynetcdn.com/reshetbet/mp3',
        urlLogo: null,
        pais: 'IL',
        ciudad: 'Tel Aviv',
        genero: 'Noticias',
        esDestacada: false,
        categoria: 'Noticias',
        categoriaEmoji: '📰',
      },
    ],
  },
];
