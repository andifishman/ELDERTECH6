import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../middlewares/errorHandler';
import * as agendaService from '../services/agenda/AgendaService';
import { requireUser, requireUuidParam } from '../utils/validators';
import {
  cambiarEstadoSchema,
  crearRecordatorioSchema,
  editarRecordatorioSchema,
  importarHorarioSchema,
  listarRecordatoriosQuerySchema,
  proximosQuerySchema,
  rangoFechaQuerySchema,
  subirAudioBodySchema,
} from '../validators/agenda.validators';

export async function getListar(req: Request, res: Response): Promise<void> {
  const opciones = listarRecordatoriosQuerySchema.parse(req.query);
  res.json(await agendaService.listar(requireUser(req), opciones));
}

export async function postCrear(req: Request, res: Response): Promise<void> {
  const input = crearRecordatorioSchema.parse(req.body);
  const recordatorio = await agendaService.crear(requireUser(req), input);
  res.status(StatusCodes.CREATED).json(recordatorio);
}

export async function getPorId(req: Request, res: Response): Promise<void> {
  const id = requireUuidParam(req, 'id');
  res.json(await agendaService.obtenerPorId(requireUser(req), id));
}

export async function patchEditar(req: Request, res: Response): Promise<void> {
  const id = requireUuidParam(req, 'id');
  const input = editarRecordatorioSchema.parse(req.body);
  res.json(await agendaService.editar(requireUser(req), id, input));
}

export async function deleteEliminar(req: Request, res: Response): Promise<void> {
  const id = requireUuidParam(req, 'id');
  await agendaService.eliminar(requireUser(req), id);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function patchEstado(req: Request, res: Response): Promise<void> {
  const id = requireUuidParam(req, 'id');
  const { estado } = cambiarEstadoSchema.parse(req.body);
  res.json(await agendaService.cambiarEstado(requireUser(req), id, estado));
}

export async function getHoy(req: Request, res: Response): Promise<void> {
  res.json(await agendaService.listarHoy(requireUser(req)));
}

export async function getSemana(req: Request, res: Response): Promise<void> {
  const { fecha } = rangoFechaQuerySchema.parse(req.query);
  res.json(await agendaService.listarSemana(requireUser(req), fecha));
}

export async function getMes(req: Request, res: Response): Promise<void> {
  const { fecha } = rangoFechaQuerySchema.parse(req.query);
  res.json(await agendaService.listarMes(requireUser(req), fecha));
}

export async function getProximos(req: Request, res: Response): Promise<void> {
  const { limit } = proximosQuerySchema.parse(req.query);
  res.json(await agendaService.listarProximos(requireUser(req), limit));
}

export async function postAudio(req: Request, res: Response): Promise<void> {
  const { duracionSegundos } = subirAudioBodySchema.parse(req.body);
  const file = req.file;
  if (!file) throw new HttpError(StatusCodes.BAD_REQUEST, 'Falta el archivo de audio.');

  const resultado = await agendaService.subirYTranscribirAudio(requireUser(req), {
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
    duracionSegundos: duracionSegundos ?? null,
  });
  res.status(StatusCodes.CREATED).json(resultado);
}

export async function postImportarHorario(req: Request, res: Response): Promise<void> {
  const { actividadId } = importarHorarioSchema.parse(req.body);
  const recordatorio = await agendaService.importarDeHorario(requireUser(req), actividadId);
  res.status(StatusCodes.CREATED).json(recordatorio);
}
