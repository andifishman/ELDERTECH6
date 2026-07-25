import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as requestsService from '../services/requests/RequestsService';
import { crearPedidoSchema } from '../validators/requests.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

export async function getPropios(req: Request, res: Response): Promise<void> {
  res.json(await requestsService.listarPropios(requireUser(req)));
}

export async function postPedido(req: Request, res: Response): Promise<void> {
  const { tipo, titulo, descripcion, duracionSegundos } = crearPedidoSchema.parse(req.body);
  const file = req.file;

  const pedido = await requestsService.crear(requireUser(req), {
    tipo,
    titulo,
    descripcion,
    audio: file ? { buffer: file.buffer, mimeType: file.mimetype, originalName: file.originalname, duracionSegundos } : null,
  });
  res.status(201).json(pedido);
}
