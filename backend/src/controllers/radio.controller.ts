import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as radioService from '../services/radio/RadioService';
import { StatusCodes } from 'http-status-codes';

export async function getRadioData(_req: Request, res: Response): Promise<void> {
  res.json(await radioService.getRadioData());
}

export async function resolveStream(req: Request, res: Response): Promise<void> {
  const stationId = req.params.id;
  if (!stationId) throw new HttpError(StatusCodes.BAD_REQUEST, 'Falta el id de la estación.');
  res.json(await radioService.resolveStreamUrl(stationId));
}
