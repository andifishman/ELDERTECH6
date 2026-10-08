import cors from 'cors';
import { env } from '../config/env';

/**
 * Orígenes de producción que siempre se permiten, además de los de `CORS_ALLOWED_ORIGINS`.
 * La versión web/PWA vive en un dominio propio de Vercel: si dependiera solo de la variable
 * de entorno del deploy, un olvido ahí deja la web "sin datos" sin ningún error visible
 * (el navegador bloquea las respuestas y las pantallas quedan vacías).
 */
const ORIGENES_FIJOS: readonly string[] = ['https://eldertech6web.vercel.app'];

const origenesPermitidos = new Set<string>([...ORIGENES_FIJOS, ...env.corsAllowedOrigins]);

/** Allowlist explícita (web/PWA + backoffice en prod + localhost en dev) — nunca `origin: '*'` porque el backend sí exige Authorization. */
export const corsMiddleware = cors({
  origin(origin, callback) {
    // Sin header Origin (apps nativas, curl, health checks) — permitir.
    if (!origin) return callback(null, true);
    if (origenesPermitidos.has(origin)) return callback(null, true);
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
});
