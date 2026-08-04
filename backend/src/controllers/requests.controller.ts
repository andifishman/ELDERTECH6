import type { Request, Response } from 'express';
import * as requestsService from '../services/requests/RequestsService';
import { crearPedidoSchema, editarPedidoPropioSchema } from '../validators/requests.validators';
import { requireParam, requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

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
  res.status(StatusCodes.CREATED).json(pedido);
}

export async function patchPedido(req: Request, res: Response): Promise<void> {
  const { titulo, descripcion } = editarPedidoPropioSchema.parse(req.body);
  const pedido = await requestsService.editarPropio(requireUser(req), requireParam(req, 'id'), { titulo, descripcion });
  res.json(pedido);
}
