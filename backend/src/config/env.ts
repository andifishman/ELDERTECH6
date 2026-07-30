import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',

  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),

  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  upstashRedisUrl: optional('UPSTASH_REDIS_REST_URL'),
  upstashRedisToken: optional('UPSTASH_REDIS_REST_TOKEN'),

  groqApiKey: optional('GROQ_API_KEY'),
  openRouterApiKey: optional('OPENROUTER_API_KEY'),
  openRouterModel: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  geminiApiKey: optional('GEMINI_API_KEY'),
  openAiApiKey: optional('OPENAI_API_KEY'),

  openWeatherApiKey: optional('OPENWEATHER_API_KEY'),
  weatherApiApiKey: optional('WEATHERAPI_API_KEY'),
  tomorrowIoApiKey: optional('TOMORROW_IO_API_KEY'),

  // Vercel inyecta automáticamente `Authorization: Bearer <CRON_SECRET>` en las
  // llamadas de sus Cron Jobs SOLO si la env var se llama exactamente así — es
  // el mecanismo estándar de Vercel, no algo que armamos nosotros. Reemplaza a
  // la vieja INTERNAL_CRON_SECRET (declarada pero nunca usada por ningún endpoint).
  cronSecret: optional('CRON_SECRET'),

  // Opcional — sube los límites de rate-limit de Expo Push. Sin esto también funciona.
  expoAccessToken: optional('EXPO_ACCESS_TOKEN'),
};
