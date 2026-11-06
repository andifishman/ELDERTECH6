import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as residentsRepo from '../repositories/residentsRepository';
import * as organizacionesRepo from '../repositories/organizacionesRepository';
import { requireResidenteId } from '../utils/validators';

/** La app del residente avisa que se abrió: actualiza `residentes.ultima_conexion` sin que el cliente escriba en la tabla. */
export async function postConexion(req: Request, res: Response): Promise<void> {
  await residentsRepo.registrarConexion(requireResidenteId(req));
  res.status(StatusCodes.NO_CONTENT).end();
}

/**
 * Nombre y color principal de la institución de quien consulta (residente, familiar o personal). Las apps lo usan para
 * ponerse "con los colores de su geriátrico". Si la institución no tiene color cargado, devuelve null (violeta por defecto).
 */
export async function getBranding(req: Request, res: Response): Promise<void> {
  const organizacionId = req.user?.organizacionId;
  const organizacion = organizacionId ? await organizacionesRepo.obtenerActiva(organizacionId) : null;
  res.json({ nombre: organizacion?.nombre ?? null, colorPrincipal: organizacion?.colorPrincipal ?? null });
}
