/**
 * climaService.ts
 * ───────────────
 * Servicio de clima — habla con nuestro backend (eldertech-api), nunca
 * directo con Open-Meteo ni con las tablas `configuracion_clima` /
 * `ciudades_familiares` de Supabase. El backend decide qué proveedor de
 * clima responde (Open-Meteo hoy, con slots para sumar otros más adelante).
 */
import { apiClient } from './apiClient';
import type { WeatherData, GeocodingResult, CiudadGuardada } from '@/types/clima.types';

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODIFICACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/** Busca hasta 5 resultados de ciudades que coincidan con el texto ingresado. */
export async function buscarCiudades(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];
  return apiClient.get<GeocodingResult[]>(`/api/weather/search?q=${encodeURIComponent(query)}`);
}

/** Geocodifica una ciudad por nombre y devuelve el primer resultado. */
export async function geocodificarCiudad(ciudad: string): Promise<GeocodingResult> {
  const resultados = await buscarCiudades(ciudad);
  if (!resultados.length) throw new Error(`Ciudad no encontrada: ${ciudad}`);
  return resultados[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIMA ACTUAL + PRONÓSTICO
// ─────────────────────────────────────────────────────────────────────────────

export async function getClima(
  ciudad: string,
  lat: number,
  lon: number,
  timezone: string = 'America/Argentina/Buenos_Aires',
  pais: string = 'AR',
): Promise<WeatherData> {
  const params = new URLSearchParams({ ciudad, pais, lat: String(lat), lon: String(lon), timezone });
  return apiClient.get<WeatherData>(`/api/weather?${params}`);
}

/** Clima de la ciudad configurada para la organización (con fallback a Buenos Aires del lado del backend). */
export async function getClimaOrg(): Promise<WeatherData> {
  return apiClient.get<WeatherData>('/api/weather/org');
}

// ─────────────────────────────────────────────────────────────────────────────
// Ciudades familiares — sincronización con el backoffice
// ─────────────────────────────────────────────────────────────────────────────

interface CiudadFamiliarDTO {
  id: string;
  nombre: string;
  pais_codigo: string;
  lat: number;
  lon: number;
  timezone: string;
}

/** Ciudades ya vinculadas al residente en Supabase (para pre-cargar el selector la primera vez). */
export async function getCiudadesFamiliares(): Promise<CiudadFamiliarDTO[]> {
  try {
    return await apiClient.get<CiudadFamiliarDTO[]>('/api/weather/cities');
  } catch {
    return [];
  }
}

/** Sincroniza ciudades guardadas localmente contra Supabase — fallo silencioso, no bloquea la UI. */
export async function sincronizarCiudades(ciudades: CiudadGuardada[]): Promise<void> {
  if (!ciudades.length) return;
  try {
    await apiClient.post('/api/weather/cities/sync', {
      ciudades: ciudades.map((c) => ({ nombre: c.nombre, pais: c.pais, lat: c.lat, lon: c.lon, timezone: c.timezone })),
    });
  } catch {
    // Fallo silencioso — la app sigue funcionando con AsyncStorage aunque no sincronice.
  }
}

/** Desvincula una ciudad del residente en Supabase — fallo silencioso. */
export async function eliminarCiudadFamiliar(ciudad: { nombre: string; pais: string; dbId?: string }): Promise<void> {
  try {
    await apiClient.post('/api/weather/cities/remove', ciudad);
  } catch {
    // Fallo silencioso — ya se borró de AsyncStorage, esto es solo para que el backoffice quede al día.
  }
}
