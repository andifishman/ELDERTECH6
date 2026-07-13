import { ProviderFatalError, ProviderRateLimitedError, type IProvider } from '../../core/provider';
import { getLabelDia } from '../../utils/weatherDate';
import type { PronosticoDia, WeatherData, WeatherProviderInput } from './WeatherTypes';

// Códigos de condición de OpenWeather (https://openweathermap.org/weather-conditions) —
// escala propia, distinta a la WMO de Open-Meteo. Se traduce al mismo
// {label, emoji} que ya usa el resto de la app — el número de `codigo` que
// vuelve en el WeatherData es el de OpenWeather, pero nada client-side
// distingue por valor numérico, solo usa emoji/descripcion.
function decodificarOpenWeather(id: number): { label: string; emoji: string } {
  if (id >= 200 && id < 300) return { label: 'Tormenta', emoji: '⛈️' };
  if (id >= 300 && id < 400) return { label: 'Llovizna', emoji: '🌦️' };
  if (id >= 500 && id < 600) {
    if (id >= 502) return { label: 'Lluvia intensa', emoji: '🌧️' };
    return { label: 'Lluvia', emoji: '🌧️' };
  }
  if (id >= 600 && id < 700) return { label: 'Nieve', emoji: '🌨️' };
  if (id >= 700 && id < 800) return { label: 'Niebla', emoji: '🌫️' };
  if (id === 800) return { label: 'Despejado', emoji: '☀️' };
  if (id === 801 || id === 802) return { label: 'Parcialmente nublado', emoji: '⛅' };
  if (id === 803 || id === 804) return { label: 'Nublado', emoji: '☁️' };
  return { label: 'Desconocido', emoji: '🌡️' };
}

interface CurrentResponse {
  main: { temp: number; feels_like: number; humidity: number; temp_max: number; temp_min: number };
  wind: { speed: number };
  weather: Array<{ id: number }>;
}

interface ForecastResponse {
  list: Array<{
    dt_txt: string;
    main: { temp_min: number; temp_max: number };
    weather: Array<{ id: number }>;
  }>;
}

/**
 * Provider tier 2 — solo se registra si OPENWEATHER_API_KEY está configurada.
 * Usa los endpoints clásicos (Current Weather + 5 day/3 hour Forecast) del
 * plan gratuito — NO el "One Call 3.0", que exige una suscripción aparte.
 * El pronóstico de OpenWeather da 5 días en bloques de 3h — se agrupan por
 * fecha para armar el mismo shape de 7 días que Open-Meteo (puede devolver
 * menos de 7 si OpenWeather no tiene más datos).
 */
export class OpenWeatherProvider implements IProvider<WeatherProviderInput, WeatherData> {
  readonly name = 'openweather';

  constructor(
    private readonly apiKey: string,
    readonly tier: number,
  ) {}

  async call(input: WeatherProviderInput): Promise<WeatherData> {
    const params = new URLSearchParams({
      lat: String(input.lat),
      lon: String(input.lon),
      units: 'metric',
      appid: this.apiKey,
    });

    const [actualRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?${params}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?${params}`),
    ]);

    await this.assertOk(actualRes, 'weather');
    await this.assertOk(forecastRes, 'forecast');

    const actual = (await actualRes.json()) as CurrentResponse;
    const forecast = (await forecastRes.json()) as ForecastResponse;

    const codigoActual = actual.weather[0]?.id ?? 800;
    const { label, emoji } = decodificarOpenWeather(codigoActual);

    const pronostico = this.agruparPorDia(forecast.list);

    return {
      ciudad: input.ciudad,
      pais: input.pais,
      temperatura: Math.round(actual.main.temp),
      sensacionTermica: Math.round(actual.main.feels_like),
      descripcion: label,
      emoji,
      tempMax: pronostico[0]?.tempMax ?? Math.round(actual.main.temp_max),
      tempMin: pronostico[0]?.tempMin ?? Math.round(actual.main.temp_min),
      humedad: Math.round(actual.main.humidity),
      viento: Math.round(actual.wind.speed * 3.6), // m/s → km/h
      codigo: codigoActual,
      pronostico,
    };
  }

  private agruparPorDia(bloques: ForecastResponse['list']): PronosticoDia[] {
    const porFecha = new Map<string, { min: number; max: number; codigos: number[] }>();

    for (const bloque of bloques) {
      const fecha = bloque.dt_txt.slice(0, 10);
      const entry = porFecha.get(fecha) ?? { min: Infinity, max: -Infinity, codigos: [] };
      entry.min = Math.min(entry.min, bloque.main.temp_min);
      entry.max = Math.max(entry.max, bloque.main.temp_max);
      entry.codigos.push(bloque.weather[0]?.id ?? 800);
      porFecha.set(fecha, entry);
    }

    const hoy = new Date();
    return Array.from(porFecha.entries())
      .slice(0, 7)
      .map(([fecha, entry]) => {
        const codigoRepresentativo = entry.codigos[Math.floor(entry.codigos.length / 2)] ?? 800;
        const wmo = decodificarOpenWeather(codigoRepresentativo);
        return {
          fecha,
          labelDia: getLabelDia(new Date(`${fecha}T12:00:00`), hoy),
          emoji: wmo.emoji,
          descripcion: wmo.label,
          tempMax: Math.round(entry.max),
          tempMin: Math.round(entry.min),
          codigo: codigoRepresentativo,
        };
      });
  }

  private async assertOk(res: Response, label: string): Promise<void> {
    if (res.ok) return;
    const body = await res.text();
    if (res.status === 401) throw new ProviderFatalError(this.name, `OpenWeather key inválida: ${body}`);
    if (res.status === 429) throw new ProviderRateLimitedError(this.name, `OpenWeather ${label} 429: ${body}`);
    throw new Error(`OpenWeather ${label} respondió ${res.status}: ${body}`);
  }
}
