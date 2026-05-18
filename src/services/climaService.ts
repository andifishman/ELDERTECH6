/**
 * climaService.ts
 * ───────────────
 * Servicio de clima que consume dos APIs gratuitas sin necesidad de API key:
 *
 *  1. Open-Meteo Geocoding API  → convierte nombre de ciudad en coordenadas
 *  2. Open-Meteo Forecast API   → obtiene clima actual + pronóstico 7 días
 *
 * Documentación:
 *  - https://open-meteo.com/en/docs
 *  - https://open-meteo.com/en/docs/geocoding-api
 */

import type {
  WeatherData,
  OpenMeteoResponse,
  GeocodingResult,
  PronosticoDia,
} from '@/types/clima.types';
import { getLabelDia } from '@/utils/dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Tabla de códigos WMO (World Meteorological Organization)
// Cada código numérico representa un estado del tiempo.
// Se traduce al español con su emoji correspondiente.
// ─────────────────────────────────────────────────────────────────────────────
const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Despejado',              emoji: '☀️' },
  1:  { label: 'Mayormente despejado',   emoji: '🌤️' },
  2:  { label: 'Parcialmente nublado',   emoji: '⛅' },
  3:  { label: 'Nublado',               emoji: '☁️' },
  45: { label: 'Niebla',               emoji: '🌫️' },
  48: { label: 'Niebla con escarcha',  emoji: '🌫️' },
  51: { label: 'Llovizna leve',        emoji: '🌦️' },
  53: { label: 'Llovizna moderada',    emoji: '🌦️' },
  55: { label: 'Llovizna',            emoji: '🌧️' },
  61: { label: 'Lluvia leve',         emoji: '🌧️' },
  63: { label: 'Lluvia moderada',     emoji: '🌧️' },
  65: { label: 'Lluvia intensa',      emoji: '🌧️' },
  71: { label: 'Nieve leve',          emoji: '🌨️' },
  73: { label: 'Nieve moderada',      emoji: '🌨️' },
  75: { label: 'Nieve intensa',       emoji: '❄️' },
  80: { label: 'Chaparrón leve',      emoji: '🌦️' },
  81: { label: 'Chaparrón',          emoji: '🌧️' },
  82: { label: 'Chaparrón violento',  emoji: '⛈️' },
  95: { label: 'Tormenta',           emoji: '⛈️' },
  96: { label: 'Tormenta c/ granizo', emoji: '⛈️' },
  99: { label: 'Tormenta fuerte',    emoji: '⛈️' },
};

/** Convierte un código WMO en etiqueta + emoji. Devuelve un fallback si no se reconoce. */
function decodificarWMO(codigo: number): { label: string; emoji: string } {
  return WMO_CODES[codigo] ?? { label: 'Desconocido', emoji: '🌡️' };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODIFICACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca hasta 5 resultados de ciudades que coincidan con el texto ingresado.
 * Se usa para el buscador de ciudades en la pantalla de Clima.
 *
 * @param query  Texto parcial o completo del nombre de la ciudad
 * @returns      Lista de resultados con coordenadas y zona horaria
 */
export async function buscarCiudades(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=es&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al buscar ciudades');

  const json = await res.json();
  if (!json.results?.length) return [];

  // Mapear cada resultado al tipo GeocodingResult
  return json.results.map((r: any) => ({
    name: r.name,
    country_code: r.country_code ?? '',
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone ?? 'UTC',
    admin1: r.admin1,    // Provincia o estado
    country: r.country,  // Nombre completo del país
  }));
}

/**
 * Geocodifica una ciudad por nombre y devuelve el primer resultado.
 * Se usa como fallback cuando no hay coordenadas guardadas en Supabase.
 *
 * @param ciudad  Nombre de la ciudad
 * @returns       Primer resultado de geocodificación
 */
export async function geocodificarCiudad(ciudad: string): Promise<GeocodingResult> {
  const resultados = await buscarCiudades(ciudad);
  if (!resultados.length) throw new Error(`Ciudad no encontrada: ${ciudad}`);
  return resultados[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIMA ACTUAL + PRONÓSTICO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el clima actual y el pronóstico de 7 días para unas coordenadas dadas.
 * Usa la API gratuita de Open-Meteo (sin API key).
 *
 * @param ciudad    Nombre de la ciudad (solo para mostrar en pantalla)
 * @param lat       Latitud geográfica
 * @param lon       Longitud geográfica
 * @param timezone  Zona horaria (ej: 'America/Argentina/Buenos_Aires')
 * @param pais      Código de país ISO (ej: 'AR')
 * @returns         Objeto WeatherData listo para renderizar
 */
export async function getClima(
  ciudad: string,
  lat: number,
  lon: number,
  timezone: string = 'America/Argentina/Buenos_Aires',
  pais: string = 'AR',
): Promise<WeatherData> {
  // Construir los parámetros de la URL
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    // Campos del clima actual
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
    // Campos del pronóstico diario
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone,
    forecast_days: '7',
    wind_speed_unit: 'kmh',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener clima');

  const json: OpenMeteoResponse = await res.json();
  const hoy = new Date();
  const actual = json.current;
  const diario = json.daily;

  // Decodificar el estado del tiempo actual
  const { label, emoji } = decodificarWMO(actual.weather_code);

  // Construir el pronóstico de 7 días
  const pronostico: PronosticoDia[] = diario.time.map((fechaStr, i) => {
    // Usar mediodía para evitar problemas de zona horaria al comparar fechas
    const fecha = new Date(fechaStr + 'T12:00:00');
    const wmo = decodificarWMO(diario.weather_code[i]);
    return {
      fecha: fechaStr,
      labelDia: getLabelDia(fecha, hoy),
      emoji: wmo.emoji,
      descripcion: wmo.label,
      tempMax: Math.round(diario.temperature_2m_max[i]),
      tempMin: Math.round(diario.temperature_2m_min[i]),
      codigo: diario.weather_code[i],
    };
  });

  return {
    ciudad,
    pais,
    temperatura: Math.round(actual.temperature_2m),
    sensacionTermica: Math.round(actual.apparent_temperature),
    descripcion: label,
    emoji,
    tempMax: Math.round(diario.temperature_2m_max[0]),
    tempMin: Math.round(diario.temperature_2m_min[0]),
    humedad: Math.round(actual.relative_humidity_2m),
    viento: Math.round(actual.wind_speed_10m),
    codigo: actual.weather_code,
    pronostico,
  };
}
