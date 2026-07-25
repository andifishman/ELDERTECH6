import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as requestsAdminService from '../services/requests/RequestsAdminService';
import { actualizarEstadoSchema, listarQuerySchema } from '../validators/requestsAdmin.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Falta el parámetro ${name}.`);
  return value;
}

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
  res.status(204).end();
}

export async function deletePedido(req: Request, res: Response): Promise<void> {
  await requestsAdminService.eliminar(requireUser(req), requireParam(req, 'id'));
  res.status(204).end();
}

export async function postReintentarTranscripcion(req: Request, res: Response): Promise<void> {
  res.json(await requestsAdminService.reintentarTranscripcion(requireParam(req, 'id')));
}
