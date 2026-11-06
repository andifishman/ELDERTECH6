import type { Request, Response } from 'express';
import { z } from 'zod';
import * as service from '../services/horariosExternos/HorariosExternosService';
import { feedAplicaA } from '../config/feedHorarios';

/** Grilla vacía para las instituciones que no son dueñas del feed externo. */
const sinFeed = () => ({ generadoEn: null, actualizadoEn: new Date().toISOString(), actividades: [] });

const querySchema = z.object({ dia: z.string().trim().min(1).max(20).optional() });

/** App del residente y backoffice: grilla (o un día) tomada de la caché de 5 min. */
export async function getActividades(req: Request, res: Response): Promise<void> {
  const { dia } = querySchema.parse(req.query);
  if (!feedAplicaA(req.user?.organizacionId)) {
    res.json(sinFeed());
    return;
  }
  res.json(await service.obtenerActividades(dia));
}

/** Backoffice: "Actualizar ahora" — salta la caché y vuelve a leer el feed. */
export async function postActualizar(req: Request, res: Response): Promise<void> {
  if (!feedAplicaA(req.user?.organizacionId)) {
    res.json(sinFeed());
    return;
  }
  res.json(await service.obtenerSnapshot(true));
}
