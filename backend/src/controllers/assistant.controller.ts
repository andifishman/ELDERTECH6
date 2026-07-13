import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import { getOrganizacionIdDeResidente } from '../repositories/residentsRepository';
import * as assistantService from '../services/assistant/AssistantService';
import {
  actualizarTituloSchema,
  chatCompletionSchema,
  generarTituloSchema,
  getMensajesQuerySchema,
  guardarMensajeSchema,
  toggleFavoritoSchema,
} from '../validators/assistant.validators';

function requireResidenteId(req: Request): string {
  const residenteId = req.user?.residenteId;
  if (!residenteId) throw new HttpError(403, 'Este usuario no tiene un residente asociado.');
  return residenteId;
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Falta el parámetro ${name}.`);
  return value;
}

export async function postSesion(req: Request, res: Response): Promise<void> {
  const sesion = await assistantService.crearSesion(requireResidenteId(req));
  res.status(201).json(sesion);
}

export async function getSesiones(req: Request, res: Response): Promise<void> {
  const limitRaw = req.query.limit;
  const limit = typeof limitRaw === 'string' && limitRaw.trim() !== '' ? Number(limitRaw) : undefined;
  res.json(await assistantService.getSesiones(requireResidenteId(req), limit));
}

export async function patchSesion(req: Request, res: Response): Promise<void> {
  const { titulo } = actualizarTituloSchema.parse(req.body);
  await assistantService.actualizarTituloSesion(requireResidenteId(req), requireParam(req, 'id'), titulo);
  res.status(204).end();
}

export async function postGenerarTitulo(req: Request, res: Response): Promise<void> {
  const { primerMensaje } = generarTituloSchema.parse(req.body);
  requireResidenteId(req);
  res.json({ titulo: await assistantService.generarTituloSesion(primerMensaje) });
}

export async function getMensajes(req: Request, res: Response): Promise<void> {
  const { sesionId } = getMensajesQuerySchema.parse(req.query);
  res.json(await assistantService.getMensajes(requireResidenteId(req), sesionId));
}

export async function getMensajesFavoritos(req: Request, res: Response): Promise<void> {
  res.json(await assistantService.getMensajesFavoritos(requireResidenteId(req)));
}

export async function postMensaje(req: Request, res: Response): Promise<void> {
  const { sesionId, rol, contenido } = guardarMensajeSchema.parse(req.body);
  const mensaje = await assistantService.guardarMensaje(requireResidenteId(req), sesionId, rol, contenido);
  res.status(201).json(mensaje);
}

export async function patchMensajeFavorito(req: Request, res: Response): Promise<void> {
  const { esFavorito } = toggleFavoritoSchema.parse(req.body);
  await assistantService.toggleFavorito(requireResidenteId(req), requireParam(req, 'id'), esFavorito);
  res.status(204).end();
}

export async function postChatCompletion(req: Request, res: Response): Promise<void> {
  const { mensaje, historial } = chatCompletionSchema.parse(req.body);
  const residenteId = requireResidenteId(req);
  const organizacionId = await getOrganizacionIdDeResidente(residenteId);
  res.json(await assistantService.consultarIA(organizacionId, mensaje, historial));
}

export async function getFaq(_req: Request, res: Response): Promise<void> {
  res.json(await assistantService.getFaq());
}

export async function postTranscribe(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new HttpError(400, 'Falta el archivo de audio.');
  requireResidenteId(req);

  const texto = await assistantService.transcribir(file.buffer, file.originalname || 'audio.m4a', file.mimetype);
  res.json({ texto });
}
