import type { IProvider } from '../../core/provider';
import { fetchRadioCatalog } from '../../repositories/radioRepository';
import type { RadioData, RadioStation } from './RadioTypes';

// Porteo textual de URL_OVERRIDES (src/services/radioService.ts) — correcciones
// de streams desactualizados sin tocar la fila en Supabase.
const URL_OVERRIDES: Record<string, Pick<RadioStation, 'urlStream' | 'urlFallback'>> = {
  'La 100': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/FM999_56.mp3',
    urlFallback: 'https://buecrplb01.cienradios.com.ar/la100.aac',
  },
  'Radio Mitre': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM790_56AAC.aac',
    urlFallback: 'https://buecrplb01.cienradios.com.ar/Mitre790.aac',
  },
  'Radio Rivadavia': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RIVADAVIAAAC.aac',
    urlFallback: 'https://streammax.alsolnet.com/radiorivadavia',
  },
  'Radio Continental': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/CONTINENTAL_SC',
    urlFallback: 'https://edge05.radiohdvivo.com/continental',
  },
  'La Red': {
    urlStream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LA_RED_AM910AAC.aac',
    urlFallback: null,
  },
  'CNN Radio': {
    urlStream: 'https://unlimited2-ar.dps.live/cnn-ar/aac/icecast.audio',
    urlFallback: null,
  },
  'Kan Gimel': {
    urlStream: 'https://kanliveicy.media.kan.org.il/icy/kangimmel_mp3',
    urlFallback: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
  },
  'Kan Gimmel': {
    urlStream: 'https://kanliveicy.media.kan.org.il/icy/kangimmel_mp3',
    urlFallback: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
  },
  'Kan Bet': {
    urlStream: 'https://kanbwizzlv.bynetcdn.com/kanb_mp3',
    urlFallback: 'https://kanliveicy.media.kan.org.il/icy/kanbet_mp3',
  },
  'Kol HaMuzika': {
    urlStream: 'https://kanliveicy.media.kan.org.il/icy/kankolhamusica_mp3',
    urlFallback: null,
  },
  'Kol Hamuzika': {
    urlStream: 'https://kanliveicy.media.kan.org.il/icy/kankolhamusica_mp3',
    urlFallback: null,
  },
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
  WQXR: {
    urlStream: 'https://stream.wqxr.org/wqxr',
    urlFallback: null,
  },
};

/** Provider tier 1 — catálogo real de Supabase (con overrides de URL aplicados). */
export class SupabaseRadioCatalogProvider implements IProvider<void, RadioData> {
  readonly name = 'radio-catalog:supabase';
  readonly tier = 1;

  async call(): Promise<RadioData> {
    const { radios, categorias, paises } = await fetchRadioCatalog();
    if (radios.length === 0) throw new Error('El catálogo de Supabase no tiene radios activas.');

    const radiosConOverrides = radios.map((r) => {
      const override = URL_OVERRIDES[r.nombre];
      return override ? { ...r, ...override } : r;
    });

    return { radios: radiosConOverrides, categorias, paises };
  }
}
