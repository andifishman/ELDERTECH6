import type { Request, Response } from 'express';
import * as requestsAdminService from '../services/requests/RequestsAdminService';
import { actualizarEstadoSchema, listarQuerySchema } from '../validators/requestsAdmin.validators';
import { requireParam, requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function getListado(req: Request, res: Response): Promise<void> {
  const query = listarQuerySchema.parse(req.query);
  res.json(await requestsAdminService.listar(requireUser(req), query));
}

export async function getDetalle(req: Request, res: Response): Promise<void> {
  res.json(await requestsAdminService.obtenerDetalle(requireParam(req, 'id')));
}

export async function patchEstado(req: Request, res: Response): Promise<void> {
  const { estado } = actualizarEstadoSchema.parse(req.body);
  await requestsAdminService.actualizarEstado(requireUser(req), requireParam(req, 'id'), estado);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function deletePedido(req: Request, res: Response): Promise<void> {
  await requestsAdminService.eliminar(requireUser(req), requireParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function postReintentarTranscripcion(req: Request, res: Response): Promise<void> {
  res.json(await requestsAdminService.reintentarTranscripcion(requireParam(req, 'id')));
}
