import type { Request, Response } from 'express';
import { z } from 'zod';
import * as service from '../services/horariosExternos/HorariosExternosService';

const querySchema = z.object({ dia: z.string().trim().min(1).max(20).optional() });

/** App del residente y backoffice: grilla (o un día) tomada de la caché de 5 min. */
export async function getActividades(req: Request, res: Response): Promise<void> {
  const { dia } = querySchema.parse(req.query);
  res.json(await service.obtenerActividades(dia));
}

/** Backoffice: "Actualizar ahora" — salta la caché y vuelve a leer el feed. */
export async function postActualizar(_req: Request, res: Response): Promise<void> {
  res.json(await service.obtenerSnapshot(true));
}
