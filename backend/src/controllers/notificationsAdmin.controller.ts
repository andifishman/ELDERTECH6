import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as service from '../services/notifications/NotificationsAdminService';
import {
  crearNotificationSchema,
  listarQuerySchema,
  notificationInputSchema,
  previewAudienciaSchema,
  programarSchema,
} from '../validators/notificationsAdmin.validators';

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
  res.json(await service.listar(requireUser(req), query));
}

export async function postPreviewAudiencia(req: Request, res: Response): Promise<void> {
  const { destino_tipo, destino_filtro, excluir_residente_ids } = previewAudienciaSchema.parse(req.body);
  res.json(await service.previsualizarAudiencia(requireUser(req), destino_tipo, destino_filtro ?? null, excluir_residente_ids ?? null));
}

export async function postCrear(req: Request, res: Response): Promise<void> {
  const { notificacion, accion } = crearNotificationSchema.parse(req.body);
  const creada = await service.crear(requireUser(req), notificacion, accion);
  res.status(201).json(creada);
}

export async function getDetalle(req: Request, res: Response): Promise<void> {
  res.json(await service.obtenerDetalle(requireParam(req, 'id')));
}

export async function patchActualizar(req: Request, res: Response): Promise<void> {
  const input = notificationInputSchema.partial().parse(req.body);
  res.json(await service.actualizar(requireUser(req), requireParam(req, 'id'), input));
}

export async function deleteEliminar(req: Request, res: Response): Promise<void> {
  await service.eliminar(requireUser(req), requireParam(req, 'id'));
  res.status(204).end();
}

export async function postEnviarAhora(req: Request, res: Response): Promise<void> {
  res.json(await service.enviarAhora(requireUser(req), requireParam(req, 'id')));
}

export async function postProgramar(req: Request, res: Response): Promise<void> {
  const { programada_para, recurrencia } = programarSchema.parse(req.body);
  res.json(await service.programar(requireUser(req), requireParam(req, 'id'), programada_para, recurrencia));
}

export async function postCancelar(req: Request, res: Response): Promise<void> {
  await service.cancelar(requireUser(req), requireParam(req, 'id'));
  res.status(204).end();
}

export async function postReenviar(req: Request, res: Response): Promise<void> {
  res.json(await service.reenviar(requireUser(req), requireParam(req, 'id')));
}

export async function postDuplicar(req: Request, res: Response): Promise<void> {
  res.status(201).json(await service.duplicar(requireUser(req), requireParam(req, 'id')));
}

export async function getDestinatarios(req: Request, res: Response): Promise<void> {
  res.json(await service.listarDestinatarios(requireParam(req, 'id')));
}

export async function getLogs(req: Request, res: Response): Promise<void> {
  res.json(await service.listarLogs(requireParam(req, 'id')));
}
