import { getCacheStore } from '../../cache';
import { ProviderManager } from '../../core/provider';
import { HardcodedRadioCatalogProvider } from '../../providers/radio/HardcodedRadioCatalogProvider';
import type { RadioData } from '../../providers/radio/RadioTypes';
import { SupabaseRadioCatalogProvider } from '../../providers/radio/SupabaseRadioCatalogProvider';
import { HttpError } from '../../middlewares/errorHandler';

const CATALOG_CACHE_KEY = 'radio:catalog';
const CATALOG_CACHE_TTL_SECONDS = 60 * 60; // 1h — las radios cambian poco, igual al staleTime que ya usaba el cliente
const STREAMTHEWORLD_RESOLVE_TTL_SECONDS = 15 * 60; // igual a lo documentado en RADIO_RESEARCH.md

const STREAMTHEWORLD_HOST = 'playerservices.streamtheworld.com';

let catalogManager: ProviderManager<void, RadioData> | null = null;

function getCatalogManager(): ProviderManager<void, RadioData> {
  if (catalogManager) return catalogManager;
  catalogManager = new ProviderManager([new SupabaseRadioCatalogProvider(), new HardcodedRadioCatalogProvider()], getCacheStore(), {
    timeoutMs: 8_000,
    retriesPerProvider: 1,
  });
  return catalogManager;
}

export async function getHealthSnapshot() {
  return getCatalogManager().getHealthSnapshot();
}

/** Catálogo completo — el cliente ya no sabe si vino de Supabase o del fallback hardcodeado. */
export async function getRadioData(): Promise<RadioData> {
  const cache = getCacheStore();
  const cached = await cache.get<RadioData>(CATALOG_CACHE_KEY);
  if (cached) return cached;

  const data = await getCatalogManager().execute();
  await cache.set(CATALOG_CACHE_KEY, data, CATALOG_CACHE_TTL_SECONDS);
  return data;
}

/**
 * Resuelve el stream final de una estación. Para StreamTheWorld/Triton, la URL
 * estática expira — hay que pedir el redirect en runtime (Nivel 1 de
 * RADIO_RESEARCH.md) y cachear 15 min. Para el resto, devuelve la URL tal cual.
 */
export async function resolveStreamUrl(stationId: string): Promise<{ url: string }> {
  const catalogo = await getRadioData();
  const estacion = catalogo.radios.find((r) => r.id === stationId);
  if (!estacion) throw new HttpError(404, 'Estación no encontrada.');

  if (!estacion.urlStream.includes(STREAMTHEWORLD_HOST)) {
    return { url: estacion.urlStream };
  }

  const cache = getCacheStore();
  const cacheKey = `radio:resolve:${stationId}`;
  const cached = await cache.get<string>(cacheKey);
  if (cached) return { url: cached };

  const res = await fetch(estacion.urlStream, { redirect: 'follow' });
  const resolved = res.url || estacion.urlStream;
  await cache.set(cacheKey, resolved, STREAMTHEWORLD_RESOLVE_TTL_SECONDS);
  return { url: resolved };
}
