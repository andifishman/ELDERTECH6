import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../middlewares/errorHandler';
import * as hablemosService from '../services/hablemos/HablemosService';
import { requireUser, requireUuidParam } from '../utils/validators';
import {
  buscarResidentesQuerySchema,
  crearConversacionSchema,
  enviarMensajeAudioBodySchema,
  enviarMensajeTextoSchema,
  listarMensajesQuerySchema,
} from '../validators/hablemos.validators';

export async function getBuscarResidentes(req: Request, res: Response): Promise<void> {
  const { q } = buscarResidentesQuerySchema.parse(req.query);
  res.json(await hablemosService.buscarResidentes(requireUser(req), q));
}

export async function getConversaciones(req: Request, res: Response): Promise<void> {
  res.json(await hablemosService.listarConversaciones(requireUser(req)));
}

export async function postConversacion(req: Request, res: Response): Promise<void> {
  const { residenteId } = crearConversacionSchema.parse(req.body);
  const conversacion = await hablemosService.iniciarConversacion(requireUser(req), residenteId);
  res.status(StatusCodes.CREATED).json(conversacion);
}

export async function getMensajes(req: Request, res: Response): Promise<void> {
  const conversacionId = requireUuidParam(req, 'id');
  const { before, limit } = listarMensajesQuerySchema.parse(req.query);
  const mensajes = await hablemosService.listarMensajes(requireUser(req), conversacionId, { before, limit: limit ?? 0 });
  res.json(mensajes);
}

export async function postMensajeTexto(req: Request, res: Response): Promise<void> {
  const conversacionId = requireUuidParam(req, 'id');
  const { contenido } = enviarMensajeTextoSchema.parse(req.body);
  const mensaje = await hablemosService.enviarMensajeTexto(requireUser(req), { conversacionId, contenido });
  res.status(StatusCodes.CREATED).json(mensaje);
}

export async function postMensajeAudio(req: Request, res: Response): Promise<void> {
  const conversacionId = requireUuidParam(req, 'id');
  const { duracionSegundos } = enviarMensajeAudioBodySchema.parse(req.body);
  const file = req.file;
  if (!file) throw new HttpError(StatusCodes.BAD_REQUEST, 'Falta el archivo de audio.');

  const mensaje = await hablemosService.enviarMensajeAudio(requireUser(req), {
    conversacionId,
    audio: { buffer: file.buffer, mimeType: file.mimetype, originalName: file.originalname, duracionSegundos: duracionSegundos ?? null },
  });
  res.status(StatusCodes.CREATED).json(mensaje);
}

export async function patchRecibidos(req: Request, res: Response): Promise<void> {
  const conversacionId = requireUuidParam(req, 'id');
  await hablemosService.marcarRecibidos(requireUser(req), conversacionId);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function patchLeidos(req: Request, res: Response): Promise<void> {
  const conversacionId = requireUuidParam(req, 'id');
  await hablemosService.marcarLeidos(requireUser(req), conversacionId);
  res.status(StatusCodes.NO_CONTENT).end();
}
