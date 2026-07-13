import { getCacheStore } from '../../cache';
import { env } from '../../config/env';
import { ProviderManager, type IProvider } from '../../core/provider';
import { buscarCiudadesOpenMeteo, OpenMeteoProvider } from '../../providers/weather/OpenMeteoProvider';
import { OpenWeatherProvider } from '../../providers/weather/OpenWeatherProvider';
import type { GeocodingResult, WeatherData, WeatherProviderInput } from '../../providers/weather/WeatherTypes';
import * as repo from '../../repositories/weatherRepository';

const CIUDAD_NATAL: WeatherProviderInput = {
  ciudad: 'Buenos Aires',
  pais: 'AR',
  lat: -34.6037,
  lon: -58.3816,
  timezone: 'America/Argentina/Buenos_Aires',
};

const WEATHER_CACHE_TTL_SECONDS = 10 * 60; // el clima cambia lento — igual al staleTime que ya usaba el cliente
const GEOCODING_CACHE_TTL_SECONDS = 60 * 60;

let weatherManager: ProviderManager<WeatherProviderInput, WeatherData> | null = null;

function getWeatherManager(): ProviderManager<WeatherProviderInput, WeatherData> {
  if (weatherManager) return weatherManager;

  const providers: IProvider<WeatherProviderInput, WeatherData>[] = [new OpenMeteoProvider()];

  if (env.openWeatherApiKey) providers.push(new OpenWeatherProvider(env.openWeatherApiKey, 2));

  // Slots listos para sumar más vendors si se cargan esas keys en env — cada
  // uno implementaría IProvider<WeatherProviderInput, WeatherData>
  // normalizando su respuesta al mismo WeatherData, igual que OpenWeatherProvider:
  //   env.weatherApiApiKey && new WeatherApiProvider(env.weatherApiApiKey, 3)
  //   env.tomorrowIoApiKey && new TomorrowIoProvider(env.tomorrowIoApiKey, 4)

  weatherManager = new ProviderManager(providers, getCacheStore(), {
    timeoutMs: 8_000,
    retriesPerProvider: 2,
  });
  return weatherManager;
}

function cacheKey(input: WeatherProviderInput): string {
  // Redondeado a ~1km — misma ciudad pedida con float ligeramente distinto pega el mismo cache.
  return `weather:${input.lat.toFixed(2)}:${input.lon.toFixed(2)}`;
}

export async function getHealthSnapshot() {
  return getWeatherManager().getHealthSnapshot();
}

export async function getWeather(input: WeatherProviderInput): Promise<WeatherData> {
  const cache = getCacheStore();
  const key = cacheKey(input);

  const cached = await cache.get<WeatherData>(key);
  if (cached) return cached;

  const data = await getWeatherManager().execute(input);
  await cache.set(key, data, WEATHER_CACHE_TTL_SECONDS);
  return data;
}

export async function searchCities(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const cache = getCacheStore();
  const key = `weather:search:${query.trim().toLowerCase()}`;
  const cached = await cache.get<GeocodingResult[]>(key);
  if (cached) return cached;

  const results = await buscarCiudadesOpenMeteo(query);
  await cache.set(key, results, GEOCODING_CACHE_TTL_SECONDS);
  return results;
}

/**
 * Clima de la ciudad configurada para la organización — porteo de
 * `fetchClimaOrg` (src/hooks/useClima.ts). Si no hay configuración, usa
 * Buenos Aires; si no hay coordenadas guardadas, geocodifica por nombre.
 */
export async function getWeatherForOrg(organizacionId: string | null): Promise<WeatherData> {
  const config = organizacionId ? await repo.getConfiguracionClima(organizacionId) : null;

  if (!config) return getWeather(CIUDAD_NATAL);

  if (config.latitud !== null && config.longitud !== null) {
    return getWeather({
      ciudad: config.ciudad,
      pais: 'AR',
      lat: Number(config.latitud),
      lon: Number(config.longitud),
      timezone: 'America/Argentina/Buenos_Aires',
    });
  }

  const geo = (await searchCities(config.ciudad))[0];
  if (!geo) return getWeather(CIUDAD_NATAL);

  return getWeather({
    ciudad: config.ciudad,
    pais: geo.country_code,
    lat: geo.latitude,
    lon: geo.longitude,
    timezone: 'America/Argentina/Buenos_Aires',
  });
}
