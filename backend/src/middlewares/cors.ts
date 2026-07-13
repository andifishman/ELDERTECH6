import cors from 'cors';
import { env } from '../config/env';

/** Allowlist explícita (backoffice en prod + localhost en dev) — nunca `origin: '*'` porque el backend sí exige Authorization. */
export const corsMiddleware = cors({
  origin(origin, callback) {
    // Sin header Origin (apps nativas, curl, health checks) — permitir.
    if (!origin) return callback(null, true);
    if (env.corsAllowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
});
