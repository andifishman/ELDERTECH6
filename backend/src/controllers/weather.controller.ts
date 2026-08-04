import type { Request, Response } from 'express';
import * as residentsService from '../services/residents/ResidentsService';
import * as citiesService from '../services/weather/CitiesService';
import * as weatherService from '../services/weather/WeatherService';
import {
  getWeatherQuerySchema,
  removeCitySchema,
  searchCitiesQuerySchema,
  syncCitiesSchema,
} from '../validators/weather.validators';
import { requireResidenteId } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

/** Clima de la ciudad configurada para la organización del residente logueado. */
export async function getWeatherOrg(req: Request, res: Response): Promise<void> {
  const residenteId = requireResidenteId(req);
  const organizacionId = await residentsService.getOrganizacionIdDeResidente(residenteId);
  res.json(await weatherService.getWeatherForOrg(organizacionId));
}

/** Clima de una ciudad puntual (ya con coordenadas resueltas del lado del cliente). */
export async function getWeather(req: Request, res: Response): Promise<void> {
  const query = getWeatherQuerySchema.parse(req.query);
  res.json(
    await weatherService.getWeather({
      ciudad: query.ciudad,
      pais: query.pais,
      lat: query.lat,
      lon: query.lon,
      timezone: query.timezone,
    }),
  );
}

export async function searchCities(req: Request, res: Response): Promise<void> {
  const { q } = searchCitiesQuerySchema.parse(req.query);
  res.json(await weatherService.searchCities(q));
}

export async function getCities(req: Request, res: Response): Promise<void> {
  res.json(await citiesService.getCiudadesFamiliares(requireResidenteId(req)));
}

export async function syncCities(req: Request, res: Response): Promise<void> {
  const { ciudades } = syncCitiesSchema.parse(req.body);
  await citiesService.syncCiudades(requireResidenteId(req), ciudades);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function removeCity(req: Request, res: Response): Promise<void> {
  const body = removeCitySchema.parse(req.body);
  await citiesService.removeCiudad(requireResidenteId(req), body);
  res.status(StatusCodes.NO_CONTENT).end();
}
