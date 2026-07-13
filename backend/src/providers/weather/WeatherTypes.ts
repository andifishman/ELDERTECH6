export interface WeatherProviderInput {
  ciudad: string;
  pais: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface PronosticoDia {
  fecha: string;
  labelDia: string;
  emoji: string;
  descripcion: string;
  tempMax: number;
  tempMin: number;
  codigo: number;
}

/** DTO normalizado — el mismo shape sin importar qué proveedor de clima respondió. */
export interface WeatherData {
  ciudad: string;
  pais: string;
  temperatura: number;
  sensacionTermica: number;
  descripcion: string;
  emoji: string;
  tempMax: number;
  tempMin: number;
  humedad: number;
  viento: number;
  codigo: number;
  pronostico: PronosticoDia[];
}

export interface GeocodingResult {
  name: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
  country?: string;
}
