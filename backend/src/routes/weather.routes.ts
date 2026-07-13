import { Router } from 'express';
import * as controller from '../controllers/weather.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const weatherRouter = Router();

weatherRouter.use(requireAuth);

weatherRouter.get('/org', asyncHandler(controller.getWeatherOrg));
weatherRouter.get('/search', asyncHandler(controller.searchCities));
weatherRouter.get('/', asyncHandler(controller.getWeather));

weatherRouter.get('/cities', asyncHandler(controller.getCities));
weatherRouter.post('/cities/sync', asyncHandler(controller.syncCities));
weatherRouter.post('/cities/remove', asyncHandler(controller.removeCity));
