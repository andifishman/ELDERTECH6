// Tipos para el módulo Clima (Open-Meteo API)

export interface WeatherData {
  ciudad: string;
  pais: string;
  temperatura: number;         // °C actual
  sensacionTermica: number;    // °C aparente
  descripcion: string;         // "Despejado", "Nublado", etc.
  emoji: string;               // ☀️ ⛅ 🌧️ etc.
  tempMax: number;
  tempMin: number;
  humedad: number;             // %
  viento: number;              // km/h
  codigo: number;              // WMO weather code
  pronostico: PronosticoDia[];
}

export interface PronosticoDia {
  fecha: string;               // 'YYYY-MM-DD'
  labelDia: string;            // 'Hoy', 'Mañana', 'Lun', 'Mar', ...
  emoji: string;
  descripcion: string;
  tempMax: number;
  tempMin: number;
  codigo: number;
}

// Respuesta cruda de Open-Meteo
export interface OpenMeteoResponse {
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

export interface GeocodingResult {
  name: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
}
