import { ProviderFatalError, ProviderRateLimitedError, type IProvider } from '../../core/provider';
import { getLabelDia } from '../../utils/weatherDate';
import type { PronosticoDia, WeatherData, WeatherProviderInput } from './WeatherTypes';

/**
 * MET Norway (Yr) — `symbol_code` propio (ej. "partlycloudy_day"). Se le saca
 * el sufijo _day/_night/_polartwilight y se traduce al mismo {label, emoji} +
 * código WMO que usan Open-Meteo/OpenWeather, para que el DTO salga idéntico
 * sin importar qué vendor respondió. `codigo` se homologa a la escala WMO.
 */
const SYMBOL_MAP: Record<string, { label: string; emoji: string; codigo: number }> = {
  clearsky: { label: 'Despejado', emoji: '☀️', codigo: 0 },
  fair: { label: 'Mayormente despejado', emoji: '🌤️', codigo: 1 },
  partlycloudy: { label: 'Parcialmente nublado', emoji: '⛅', codigo: 2 },
  cloudy: { label: 'Nublado', emoji: '☁️', codigo: 3 },
  fog: { label: 'Niebla', emoji: '🌫️', codigo: 45 },
  lightrain: { label: 'Lluvia leve', emoji: '🌧️', codigo: 61 },
  lightrainshowers: { label: 'Lluvia leve', emoji: '🌦️', codigo: 80 },
  rain: { label: 'Lluvia', emoji: '🌧️', codigo: 63 },
  rainshowers: { label: 'Chaparrón', emoji: '🌧️', codigo: 81 },
  heavyrain: { label: 'Lluvia intensa', emoji: '🌧️', codigo: 65 },
  heavyrainshowers: { label: 'Chaparrón violento', emoji: '⛈️', codigo: 82 },
  lightsleet: { label: 'Aguanieve leve', emoji: '🌨️', codigo: 71 },
  sleet: { label: 'Aguanieve', emoji: '🌨️', codigo: 73 },
  lightsnow: { label: 'Nieve leve', emoji: '🌨️', codigo: 71 },
  snow: { label: 'Nieve', emoji: '🌨️', codigo: 73 },
  heavysnow: { label: 'Nieve intensa', emoji: '❄️', codigo: 75 },
  snowshowers: { label: 'Nevada', emoji: '🌨️', codigo: 85 },
  thunderstorm: { label: 'Tormenta', emoji: '⛈️', codigo: 95 },
  rainandthunder: { label: 'Tormenta', emoji: '⛈️', codigo: 95 },
  heavyrainandthunder: { label: 'Tormenta fuerte', emoji: '⛈️', codigo: 99 },
};

function decodificarSymbol(symbolCode: string | undefined): { label: string; emoji: string; codigo: number } {
  if (!symbolCode) return { label: 'Desconocido', emoji: '🌡️', codigo: 0 };
  // "partlycloudy_day" → "partlycloudy" (el sufijo solo indica día/noche, no cambia el clima).
  const base = symbolCode.replace(/_(day|night|polartwilight)$/, '');
  return SYMBOL_MAP[base] ?? { label: 'Desconocido', emoji: '🌡️', codigo: 0 };
}

interface TimeserieEntry {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature: number;
        relative_humidity: number;
        wind_speed: number;
      };
    };
    next_1_hours?: { summary: { symbol_code: string } };
    next_6_hours?: { summary: { symbol_code: string } };
  };
}

interface MetNoResponse {
  properties: {
    timeseries: TimeserieEntry[];
  };
}

/**
 * Provider tier 2 — gratis y SIN API key (como Open-Meteo). Garantiza que la
 * cadena de fallback funcione de fábrica aunque no se cargue ninguna key paga.
 * MET Norway exige un User-Agent identificatorio en sus términos de uso; sin él
 * responde 403. Su forecast es una serie temporal (no días cerrados): se agrupa
 * por fecha para armar el mismo shape de 7 días que los demás providers.
 */
export class MetNoProvider implements IProvider<WeatherProviderInput, WeatherData> {
  readonly name = 'met-no';

  constructor(
    readonly tier: number,
    private readonly userAgent = 'ElderTech/1.0 https://github.com/eldertech (contacto@eldertech.app)',
  ) {}

  async call(input: WeatherProviderInput): Promise<WeatherData> {
    const params = new URLSearchParams({ lat: input.lat.toFixed(4), lon: input.lon.toFixed(4) });
    const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?${params}`, {
      headers: { 'User-Agent': this.userAgent },
    });

    if (!res.ok) {
      const body = await res.text();
      // 403 acá casi siempre es User-Agent faltante/bloqueado — no es transitorio.
      if (res.status === 403) throw new ProviderFatalError(this.name, `MET Norway 403 (User-Agent): ${body}`);
      if (res.status === 429) throw new ProviderRateLimitedError(this.name, `MET Norway 429: ${body}`);
      throw new Error(`MET Norway respondió ${res.status}: ${body}`);
    }

    const json = (await res.json()) as MetNoResponse;
    const serie = json.properties.timeseries;
    if (!serie.length) throw new Error('MET Norway devolvió una serie temporal vacía.');

    const ahora = serie[0]!;
    const detalles = ahora.data.instant.details;
    const symbolActual = ahora.data.next_1_hours?.summary.symbol_code ?? ahora.data.next_6_hours?.summary.symbol_code;
    const { label, emoji, codigo } = decodificarSymbol(symbolActual);

    const pronostico = this.agruparPorDia(serie);

    return {
      ciudad: input.ciudad,
      pais: input.pais,
      temperatura: Math.round(detalles.air_temperature),
      // MET no expone sensación térmica; se usa la temperatura real (mismo criterio
      // que un día sin viento/humedad extremos) para no inventar un valor.
      sensacionTermica: Math.round(detalles.air_temperature),
      descripcion: label,
      emoji,
      tempMax: pronostico[0]?.tempMax ?? Math.round(detalles.air_temperature),
      tempMin: pronostico[0]?.tempMin ?? Math.round(detalles.air_temperature),
      humedad: Math.round(detalles.relative_humidity),
      viento: Math.round(detalles.wind_speed * 3.6), // m/s → km/h
      codigo,
      pronostico,
    };
  }

  private agruparPorDia(serie: TimeserieEntry[]): PronosticoDia[] {
    const porFecha = new Map<string, { min: number; max: number; symbols: string[] }>();

    for (const entry of serie) {
      const fecha = entry.time.slice(0, 10); // "2026-07-16T12:00:00Z" → "2026-07-16"
      const temp = entry.data.instant.details.air_temperature;
      const acc = porFecha.get(fecha) ?? { min: Infinity, max: -Infinity, symbols: [] };
      acc.min = Math.min(acc.min, temp);
      acc.max = Math.max(acc.max, temp);
      const symbol = entry.data.next_6_hours?.summary.symbol_code ?? entry.data.next_1_hours?.summary.symbol_code;
      if (symbol) acc.symbols.push(symbol);
      porFecha.set(fecha, acc);
    }

    const hoy = new Date();
    return Array.from(porFecha.entries())
      .slice(0, 7)
      .map(([fecha, acc]) => {
        // Símbolo del mediodía aproximado (mitad de las muestras del día) como representativo.
        const symbolRep = acc.symbols[Math.floor(acc.symbols.length / 2)];
        const { label, emoji, codigo } = decodificarSymbol(symbolRep);
        return {
          fecha,
          labelDia: getLabelDia(new Date(`${fecha}T12:00:00`), hoy),
          emoji,
          descripcion: label,
          tempMax: Math.round(acc.max),
          tempMin: Math.round(acc.min),
          codigo,
        };
      });
  }
}
