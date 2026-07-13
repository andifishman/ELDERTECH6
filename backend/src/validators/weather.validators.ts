import { z } from 'zod';

export const getWeatherQuerySchema = z.object({
  ciudad: z.string().trim().min(1),
  pais: z.string().trim().min(1).default('AR'),
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  timezone: z.string().trim().min(1).default('America/Argentina/Buenos_Aires'),
});

export const searchCitiesQuerySchema = z.object({
  q: z.string().trim().min(1),
});

const ciudadInputSchema = z.object({
  nombre: z.string().trim().min(1),
  pais: z.string().trim().min(1),
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  timezone: z.string().trim().min(1),
});

export const syncCitiesSchema = z.object({
  ciudades: z.array(ciudadInputSchema).max(20),
});

export const removeCitySchema = z.object({
  nombre: z.string().trim().min(1),
  pais: z.string().trim().min(1),
  dbId: z.string().uuid().optional(),
});
