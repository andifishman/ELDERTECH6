//tipos TypeScript usados en el módulo de Clima — servicio, hooks y pantallas
/**
 * clima.types.ts
 * ──────────────
 * Definición de todos los tipos TypeScript usados en el módulo de Clima.
 * Se usan tanto en el servicio (climaService.ts) como en los hooks y pantallas.
 */

/** Datos completos del clima para una ciudad, listos para mostrar en pantalla */
export interface WeatherData {
  ciudad: string;
  pais: string;
  temperatura: number;         // Temperatura actual en °C
  sensacionTermica: number;    // Temperatura aparente (sensación) en °C
  descripcion: string;         // Texto legible: "Despejado", "Nublado", etc.
  emoji: string;               // Emoji representativo: ☀️ ⛅ 🌧️ etc.
  tempMax: number;             // Temperatura máxima del día en °C
  tempMin: number;             // Temperatura mínima del día en °C
  humedad: number;             // Humedad relativa en %
  viento: number;              // Velocidad del viento en km/h
  codigo: number;              // Código WMO del estado del tiempo
  pronostico: PronosticoDia[]; // Pronóstico para los próximos 7 días
}

/** Datos de un día individual dentro del pronóstico de 7 días */
export interface PronosticoDia {
  fecha: string;       // Fecha en formato 'YYYY-MM-DD'
  labelDia: string;    // Etiqueta legible: 'Hoy', 'Mañana', 'Lun', 'Mar', etc.
  emoji: string;       // Emoji del estado del tiempo ese día
  descripcion: string; // Descripción textual del estado del tiempo
  tempMax: number;     // Temperatura máxima del día en °C
  tempMin: number;     // Temperatura mínima del día en °C
  codigo: number;      // Código WMO del estado del tiempo
}

/**
 * Respuesta cruda de la API Open-Meteo.
 * Solo se mapean los campos que realmente se usan.
 */
export interface OpenMeteoResponse {
  current: {
    temperature_2m: number;          // Temperatura actual
    apparent_temperature: number;    // Sensación térmica
    weather_code: number;            // Código WMO
    wind_speed_10m: number;          // Viento a 10m de altura
    relative_humidity_2m: number;    // Humedad relativa
  };
  daily: {
    time: string[];                  // Fechas 'YYYY-MM-DD'
    weather_code: number[];          // Código WMO por día
    temperature_2m_max: number[];    // Máximas diarias
    temperature_2m_min: number[];    // Mínimas diarias
  };
}

/** Resultado de la API de geocodificación (Open-Meteo Geocoding) */
export interface GeocodingResult {
  name: string;          // Nombre de la ciudad
  country_code: string;  // Código de país ISO (ej: 'AR', 'IT')
  latitude: number;      // Latitud geográfica
  longitude: number;     // Longitud geográfica
  timezone: string;      // Zona horaria (ej: 'America/Argentina/Buenos_Aires')
  admin1?: string;       // Provincia / estado (opcional)
  country?: string;      // Nombre completo del país (opcional)
}

/**
 * Ciudad guardada por el usuario en el selector de ciudades.
 * Se persiste en AsyncStorage para recordarla entre sesiones.
 */
export interface CiudadGuardada {
  id: string;            // ID único generado al agregar (timestamp)
  nombre: string;        // Nombre de la ciudad tal como la devuelve la API
  pais: string;          // Código de país ISO
  paisNombre: string;    // Nombre completo del país para mostrar
  lat: number;           // Latitud
  lon: number;           // Longitud
  timezone: string;      // Zona horaria
  esNatal: boolean;      // true = ciudad natal (Buenos Aires), no se puede borrar
}
