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
  // Alias "latest" a propósito: Google discontinúa modelos con nombre de
  // versión fija (gemini-2.5-flash ya dejó de estar disponible para cuentas
  // nuevas) y el alias sigue apuntando al Flash vigente sin tocar código.
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  openAiApiKey: optional('OPENAI_API_KEY'),

  openWeatherApiKey: optional('OPENWEATHER_API_KEY'),
  weatherApiApiKey: optional('WEATHERAPI_API_KEY'),
  tomorrowIoApiKey: optional('TOMORROW_IO_API_KEY'),

  // Búsqueda externa (herramienta buscar_informacion_externa del asistente) — sin esta key la herramienta queda deshabilitada, no rompe el resto del chat.
  tavilyApiKey: optional('TAVILY_API_KEY'),

  // Vercel inyecta automáticamente `Authorization: Bearer <CRON_SECRET>` en las
  // llamadas de sus Cron Jobs SOLO si la env var se llama exactamente así — es
  // el mecanismo estándar de Vercel, no algo que armamos nosotros. Reemplaza a
  // la vieja INTERNAL_CRON_SECRET (declarada pero nunca usada por ningún endpoint).
  cronSecret: optional('CRON_SECRET'),

  // Opcional — sube los límites de rate-limit de Expo Push. Sin esto también funciona.
  expoAccessToken: optional('EXPO_ACCESS_TOKEN'),

  // Web Push (versión web / PWA). Par de claves VAPID: se generan UNA vez con
  // `npx web-push generate-vapid-keys` y no deben cambiar (cambiarlas invalida todas las
  // suscripciones web existentes). La privada NUNCA va al frontend; la pública se sirve
  // desde GET /api/notifications/web-push-key. Sin ellas el push web queda deshabilitado
  // (no rompe nada más). `vapidSubject` tiene que ser un mailto: o https: de contacto real.
  vapidPublicKey: optional('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: optional('VAPID_PRIVATE_KEY'),
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:eldertech6@gmail.com',
};
