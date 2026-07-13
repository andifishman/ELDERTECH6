import type { IProvider } from '../../core/provider';
import { getLabelDia } from '../../utils/weatherDate';
import type { PronosticoDia, WeatherData, WeatherProviderInput } from './WeatherTypes';

// Porteo de src/services/climaService.ts — misma tabla WMO, mismo cálculo.
const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Despejado', emoji: '☀️' },
  1: { label: 'Mayormente despejado', emoji: '🌤️' },
  2: { label: 'Parcialmente nublado', emoji: '⛅' },
  3: { label: 'Nublado', emoji: '☁️' },
  45: { label: 'Niebla', emoji: '🌫️' },
  48: { label: 'Niebla con escarcha', emoji: '🌫️' },
  51: { label: 'Llovizna leve', emoji: '🌦️' },
  53: { label: 'Llovizna moderada', emoji: '🌦️' },
  55: { label: 'Llovizna', emoji: '🌧️' },
  61: { label: 'Lluvia leve', emoji: '🌧️' },
  63: { label: 'Lluvia moderada', emoji: '🌧️' },
  65: { label: 'Lluvia intensa', emoji: '🌧️' },
  71: { label: 'Nieve leve', emoji: '🌨️' },
  73: { label: 'Nieve moderada', emoji: '🌨️' },
  75: { label: 'Nieve intensa', emoji: '❄️' },
  80: { label: 'Chaparrón leve', emoji: '🌦️' },
  81: { label: 'Chaparrón', emoji: '🌧️' },
  82: { label: 'Chaparrón violento', emoji: '⛈️' },
  95: { label: 'Tormenta', emoji: '⛈️' },
  96: { label: 'Tormenta c/ granizo', emoji: '⛈️' },
  99: { label: 'Tormenta fuerte', emoji: '⛈️' },
};

function decodificarWMO(codigo: number): { label: string; emoji: string } {
  return WMO_CODES[codigo] ?? { label: 'Desconocido', emoji: '🌡️' };
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

/** Provider tier 1 — gratis, sin API key, siempre activo. Porteo de climaService.ts getClima(). */
export class OpenMeteoProvider implements IProvider<WeatherProviderInput, WeatherData> {
  readonly name = 'open-meteo';
  readonly tier = 1;

  async call(input: WeatherProviderInput): Promise<WeatherData> {
    const params = new URLSearchParams({
      latitude: String(input.lat),
      longitude: String(input.lon),
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      timezone: input.timezone,
      forecast_days: '7',
      wind_speed_unit: 'kmh',
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);

    const json = (await res.json()) as OpenMeteoResponse;
    const hoy = new Date();
    const actual = json.current;
    const diario = json.daily;
    const { label, emoji } = decodificarWMO(actual.weather_code);

    // Los arrays de Open-Meteo son paralelos por contrato de su API (mismo
    // largo que `time`) — noUncheckedIndexedAccess exige el `!` igual.
    const pronostico: PronosticoDia[] = diario.time.map((fechaStr, i) => {
      const fecha = new Date(`${fechaStr}T12:00:00`);
      const codigoDia = diario.weather_code[i]!;
      const wmo = decodificarWMO(codigoDia);
      return {
        fecha: fechaStr,
        labelDia: getLabelDia(fecha, hoy),
        emoji: wmo.emoji,
        descripcion: wmo.label,
        tempMax: Math.round(diario.temperature_2m_max[i]!),
        tempMin: Math.round(diario.temperature_2m_min[i]!),
        codigo: codigoDia,
      };
    });

    return {
      ciudad: input.ciudad,
      pais: input.pais,
      temperatura: Math.round(actual.temperature_2m),
      sensacionTermica: Math.round(actual.apparent_temperature),
      descripcion: label,
      emoji,
      tempMax: Math.round(diario.temperature_2m_max[0]!),
      tempMin: Math.round(diario.temperature_2m_min[0]!),
      humedad: Math.round(actual.relative_humidity_2m),
      viento: Math.round(actual.wind_speed_10m),
      codigo: actual.weather_code,
      pronostico,
    };
  }
}

/** Geocodificación — no forma parte del ProviderManager (no tiene fallback de vendor hoy), es un helper directo. */
export async function buscarCiudadesOpenMeteo(query: string): Promise<import('./WeatherTypes').GeocodingResult[]> {
  if (!query.trim()) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=es&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al buscar ciudades');

  const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
  if (!json.results?.length) return [];

  return json.results.map((r) => ({
    name: r.name as string,
    country_code: (r.country_code as string) ?? '',
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    timezone: (r.timezone as string) ?? 'UTC',
    admin1: r.admin1 as string | undefined,
    country: r.country as string | undefined,
  }));
}
