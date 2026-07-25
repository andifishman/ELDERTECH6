import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as assistantAdminService from '../services/assistant/AssistantAdminService';
import { eliminarFaqQuerySchema, faqInputSchema, historialQuerySchema, reordenarFaqSchema } from '../validators/assistantAdmin.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Falta el parámetro ${name}.`);
  return value;
}

export async function getFaqs(_req: Request, res: Response): Promise<void> {
  res.json(await assistantAdminService.listarFaqs());
}

export async function postFaq(req: Request, res: Response): Promise<void> {
  const input = faqInputSchema.parse(req.body);
  const id = await assistantAdminService.crearFaq(requireUser(req), input);
  res.status(201).json({ id });
}

export async function patchFaq(req: Request, res: Response): Promise<void> {
  const input = faqInputSchema.parse(req.body);
  await assistantAdminService.actualizarFaq(requireUser(req), requireParam(req, 'id'), input);
  res.status(204).end();
}

export async function deleteFaq(req: Request, res: Response): Promise<void> {
  const { pregunta } = eliminarFaqQuerySchema.parse(req.query);
  await assistantAdminService.eliminarFaq(requireUser(req), requireParam(req, 'id'), pregunta);
  res.status(204).end();
}

export async function postReordenar(req: Request, res: Response): Promise<void> {
  const { faqs } = reordenarFaqSchema.parse(req.body);
  await assistantAdminService.reordenarFaqs(faqs);
  res.status(204).end();
}

export async function getHistorial(req: Request, res: Response): Promise<void> {
  const { limite } = historialQuerySchema.parse(req.query);
  res.json(await assistantAdminService.obtenerHistorialMensajes(limite));
}

export async function getStats(_req: Request, res: Response): Promise<void> {
  res.json(await assistantAdminService.obtenerStats());
}
