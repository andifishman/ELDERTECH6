import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as residentsRepo from '../repositories/residentsRepository';
import { requireResidenteId } from '../utils/validators';

/** La app del residente avisa que se abrió: actualiza `residentes.ultima_conexion` sin que el cliente escriba en la tabla. */
export async function postConexion(req: Request, res: Response): Promise<void> {
  await residentsRepo.registrarConexion(requireResidenteId(req));
  res.status(StatusCodes.NO_CONTENT).end();
}
