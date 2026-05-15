import type { WeatherData, OpenMeteoResponse, GeocodingResult, PronosticoDia } from '@/types/clima.types';
import { getLabelDia } from '@/utils/dateUtils';

// WMO Weather interpretation codes → etiqueta + emoji en español
const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Despejado',             emoji: '☀️' },
  1:  { label: 'Mayormente despejado',  emoji: '🌤️' },
  2:  { label: 'Parcialmente nublado',  emoji: '⛅' },
  3:  { label: 'Nublado',              emoji: '☁️' },
  45: { label: 'Niebla',              emoji: '🌫️' },
  48: { label: 'Niebla con escarcha', emoji: '🌫️' },
  51: { label: 'Llovizna leve',       emoji: '🌦️' },
  53: { label: 'Llovizna moderada',   emoji: '🌦️' },
  55: { label: 'Llovizna',           emoji: '🌧️' },
  61: { label: 'Lluvia leve',        emoji: '🌧️' },
  63: { label: 'Lluvia moderada',    emoji: '🌧️' },
  65: { label: 'Lluvia intensa',     emoji: '🌧️' },
  71: { label: 'Nieve leve',         emoji: '🌨️' },
  73: { label: 'Nieve moderada',     emoji: '🌨️' },
  75: { label: 'Nieve intensa',      emoji: '❄️' },
  80: { label: 'Chaparrón leve',     emoji: '🌦️' },
  81: { label: 'Chaparrón',         emoji: '🌧️' },
  82: { label: 'Chaparrón violento', emoji: '⛈️' },
  95: { label: 'Tormenta',          emoji: '⛈️' },
  96: { label: 'Tormenta c/ granizo',emoji: '⛈️' },
  99: { label: 'Tormenta fuerte',   emoji: '⛈️' },
};

function decodificarWMO(codigo: number): { label: string; emoji: string } {
  return WMO_CODES[codigo] ?? { label: 'Desconocido', emoji: '🌡️' };
}

/** Busca latitud/longitud para una ciudad usando Open-Meteo Geocoding */
export async function geocodificarCiudad(ciudad: string): Promise<GeocodingResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al buscar ciudad');
  const json = await res.json();
  if (!json.results?.length) throw new Error(`Ciudad no encontrada: ${ciudad}`);
  const r = json.results[0];
  return {
    name: r.name,
    country_code: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  };
}

/** Obtiene el clima actual + pronóstico 7 días desde Open-Meteo (sin API key) */
export async function getClima(
  ciudad: string,
  lat: number,
  lon: number,
  timezone: string = 'America/Argentina/Buenos_Aires',
  pais: string = 'AR',
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
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

  const { label, emoji } = decodificarWMO(actual.weather_code);

  const pronostico: PronosticoDia[] = diario.time.map((fechaStr, i) => {
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
