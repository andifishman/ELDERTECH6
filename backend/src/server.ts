import { trustSystemCertificates } from './bootstrap/trustSystemCertificates';
import { createApp } from './app';
import { logger } from './logging/logger';

// Antes de levantar el server — así toda llamada saliente (Supabase, Groq,
// Open-Meteo) queda cubierta, no solo las que dispara la primera request.
trustSystemCertificates();

const port = Number(process.env.PORT ?? 3001);

createApp().listen(port, () => {
  logger.info(`eldertech-api escuchando en http://localhost:${port}`);
});
