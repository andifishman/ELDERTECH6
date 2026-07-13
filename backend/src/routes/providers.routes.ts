import { Router } from 'express';
import { getAssistantProvidersHealth } from '../services/assistant/AssistantChatService';
import { getHealthSnapshot as getRadioProvidersHealth } from '../services/radio/RadioService';
import { getHealthSnapshot as getWeatherProvidersHealth } from '../services/weather/WeatherService';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const providersRouter = Router();

providersRouter.use(requireAuth, requireAdmin);

// Bonus casi gratis del framework de providers (ver plan): expone circuit
// breaker + métricas de cada ProviderManager registrado.
providersRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    res.json({
      assistant: await getAssistantProvidersHealth(),
      weather: await getWeatherProvidersHealth(),
      radio: await getRadioProvidersHealth(),
    });
  }),
);
