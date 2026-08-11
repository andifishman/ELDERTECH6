import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { corsMiddleware } from './middlewares/cors';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { activitiesRouter } from './routes/activities.routes';
import { activitiesAdminRouter } from './routes/activitiesAdmin.routes';
import { administradoresRouter } from './routes/administradores.routes';
import { agendaRouter } from './routes/agenda.routes';
import { agendaCronRouter } from './routes/agendaCron.routes';
import { assistantRouter } from './routes/assistant.routes';
import { assistantAdminRouter } from './routes/assistantAdmin.routes';
import { auditRouter } from './routes/audit.routes';
import { catalogsRouter } from './routes/catalogs.routes';
import { configuracionRouter } from './routes/configuracion.routes';
import { contactsRouter } from './routes/contacts.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { gamesRouter } from './routes/games.routes';
import { hablemosRouter } from './routes/hablemos.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { notificationsAdminRouter } from './routes/notificationsAdmin.routes';
import { notificationsCronRouter } from './routes/notificationsCron.routes';
import { profileRouter } from './routes/profile.routes';
import { providersRouter } from './routes/providers.routes';
import { requestsRouter } from './routes/requests.routes';
import { requestsAdminRouter } from './routes/requestsAdmin.routes';
import { residentsAdminRouter } from './routes/residentsAdmin.routes';
import { radioRouter } from './routes/radio.routes';
import { tutorialsRouter } from './routes/tutorials.routes';
import { tutorialsAdminRouter } from './routes/tutorialsAdmin.routes';
import { weatherRouter } from './routes/weather.routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: '2mb' }));

  // `commit` y `configurado` existen para poder diagnosticar desde afuera dos
  // preguntas que ya nos costaron varias horas: "¿este deploy tiene el código
  // nuevo?" y "¿esta instancia tiene cargada la key de X?". Son solo booleanos
  // y el SHA del commit — NUNCA el valor de una key. `VERCEL_GIT_COMMIT_SHA`
  // lo inyecta Vercel solo; en local queda 'local'.
  //
  // Contexto de por qué esto existe (agosto 2026): el proyecto de Vercel de
  // este backend (`backend-beta-flax-82`) se venía deployando a mano por CLI,
  // no desde Git — así que main podía estar 9 commits adelante de producción
  // sin ninguna señal visible. Dos trampas que costaron horas:
  //  1. "Redeploy" en Vercel reconstruye EL MISMO commit viejo, no trae código
  //     nuevo. Para código nuevo: push (o `vercel --prod`).
  //  2. Con Root Directory = `backend`, un commit que no toca archivos de esta
  //     carpeta puede no disparar build. Un commit vacío NO sirve para forzarlo.
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'eldertech-api',
      time: new Date().toISOString(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      configurado: {
        groq: !!env.groqApiKey,
        openRouter: !!env.openRouterApiKey,
        busquedaExterna: !!env.tavilyApiKey,
        cacheCompartido: !!env.upstashRedisUrl,
      },
    });
  });

  app.use('/api/agenda', agendaRouter);
  app.use('/api/internal/agenda', agendaCronRouter);
  app.use('/api/assistant', assistantRouter);
  app.use('/api/weather', weatherRouter);
  app.use('/api/radio', radioRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/tutorials', tutorialsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/admin/providers', providersRouter);
  app.use('/api/admin/catalogs', catalogsRouter);
  app.use('/api/admin/tutorials', tutorialsAdminRouter);
  app.use('/api/admin/activities', activitiesAdminRouter);
  app.use('/api/admin/assistant', assistantAdminRouter);
  app.use('/api/admin/residents', residentsAdminRouter);
  app.use('/api/admin/administradores', administradoresRouter);
  app.use('/api/admin/audit', auditRouter);
  app.use('/api/admin/configuracion', configuracionRouter);
  app.use('/api/admin/dashboard', dashboardRouter);
  app.use('/api/admin/profile', profileRouter);
  app.use('/api/hablemos', hablemosRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/admin/requests', requestsAdminRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin/notifications', notificationsAdminRouter);
  app.use('/api/internal/notifications', notificationsCronRouter);
  app.use('/api/games', gamesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
