import express, { type Express } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middlewares/cors';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { activitiesRouter } from './routes/activities.routes';
import { assistantRouter } from './routes/assistant.routes';
import { contactsRouter } from './routes/contacts.routes';
import { providersRouter } from './routes/providers.routes';
import { radioRouter } from './routes/radio.routes';
import { tutorialsRouter } from './routes/tutorials.routes';
import { weatherRouter } from './routes/weather.routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'eldertech-api', time: new Date().toISOString() });
  });

  app.use('/api/assistant', assistantRouter);
  app.use('/api/weather', weatherRouter);
  app.use('/api/radio', radioRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/tutorials', tutorialsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/admin/providers', providersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
