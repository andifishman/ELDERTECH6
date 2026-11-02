import { requireParam } from '../utils/validators';
import type { Request, Response } from 'express';
import * as radioService from '../services/radio/RadioService';

export async function getRadioData(_req: Request, res: Response): Promise<void> {
  res.json(await radioService.getRadioData());
}

export async function resolveStream(req: Request, res: Response): Promise<void> {
  const stationId = requireParam(req, 'id');
  res.json(await radioService.resolveStreamUrl(stationId));
}
