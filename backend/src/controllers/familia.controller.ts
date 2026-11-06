import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { requireFamiliarContext } from '../middlewares/familia';
import * as familiaService from '../services/familia/FamiliaService';
import * as contenidoService from '../services/familia/FamiliaContenidoService';
import * as comunicacionService from '../services/familia/FamiliaComunicacionService';
import {
  comentarioSchema,
  crearCasoSchema,
  crearPropuestaSchema,
  inscripcionSchema,
  mensajeSchema,
  mesSchema,
  rangoAgendaSchema,
  reaccionSchema,
  respuestaSchema,
} from '../validators/familia.validators';
import { requireUser, requireUuidParam } from '../utils/validators';

const ctx = (req: Request) => requireFamiliarContext(req);

// ─── Perfil, inicio, agenda y calendario ─────────────────────────────────────

export async function getMe(req: Request, res: Response): Promise<void> {
  res.json(await familiaService.obtenerMe(ctx(req)));
}

export async function getInicio(req: Request, res: Response): Promise<void> {
  const residenteId = req.query.residenteId === undefined ? null : z.string().uuid('residenteId inválido').parse(req.query.residenteId);
  res.json(await familiaService.inicio(ctx(req), residenteId));
}

export async function getAgenda(req: Request, res: Response): Promise<void> {
  const rango = rangoAgendaSchema.parse(req.query);
  res.json(await familiaService.agendaDelResidente(ctx(req), requireUuidParam(req, 'residenteId'), rango));
}

export async function getCalendario(req: Request, res: Response): Promise<void> {
  const { mes } = mesSchema.parse(req.query);
  res.json(await familiaService.calendario(ctx(req), mes));
}

// ─── Contenido ───────────────────────────────────────────────────────────────

export async function getAvisos(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarAvisos(ctx(req)));
}

export async function postConfirmarAviso(req: Request, res: Response): Promise<void> {
  await contenidoService.confirmarAviso(ctx(req), requireUuidParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function getNoticias(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarNoticias(ctx(req)));
}

export async function getDocumentos(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarDocumentos(ctx(req)));
}

export async function getEventos(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarEventos(ctx(req)));
}

export async function postInscripcion(req: Request, res: Response): Promise<void> {
  const { personas } = inscripcionSchema.parse(req.body ?? {});
  await contenidoService.inscribirse(ctx(req), requireUuidParam(req, 'id'), personas);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function deleteInscripcion(req: Request, res: Response): Promise<void> {
  await contenidoService.cancelarInscripcion(ctx(req), requireUuidParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}

// ─── Fotos ───────────────────────────────────────────────────────────────────

export async function getAlbumes(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarAlbumes(ctx(req)));
}

export async function getAlbum(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.obtenerAlbum(ctx(req), requireUuidParam(req, 'id')));
}

export async function putReaccion(req: Request, res: Response): Promise<void> {
  const { tipo } = reaccionSchema.parse(req.body);
  await contenidoService.reaccionar(ctx(req), requireUuidParam(req, 'id'), tipo);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function getComentarios(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarComentarios(ctx(req), requireUuidParam(req, 'id')));
}

export async function postComentario(req: Request, res: Response): Promise<void> {
  const { texto } = comentarioSchema.parse(req.body);
  await contenidoService.comentar(ctx(req), requireUuidParam(req, 'id'), texto);
  res.status(StatusCodes.CREATED).end();
}

export async function deleteComentario(req: Request, res: Response): Promise<void> {
  await contenidoService.borrarComentarioPropio(ctx(req), requireUuidParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}

// ─── Mensajes ────────────────────────────────────────────────────────────────

export async function getHilos(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.hilosDelFamiliar(ctx(req)));
}

export async function getMensajes(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.mensajesDelFamiliar(ctx(req), requireUuidParam(req, 'residenteId')));
}

export async function postMensaje(req: Request, res: Response): Promise<void> {
  const { contenido } = mensajeSchema.parse(req.body ?? {});
  const mensaje = await comunicacionService.enviarMensajeFamiliar(ctx(req), requireUuidParam(req, 'residenteId'), contenido, req.file?.buffer ?? null);
  res.status(StatusCodes.CREATED).json(mensaje);
}

// ─── Consultas, reclamos y propuestas ────────────────────────────────────────

export async function getCategorias(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.listarCategorias(ctx(req).organizacionId));
}

export async function getCasos(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.listarCasos(ctx(req)));
}

export async function postCaso(req: Request, res: Response): Promise<void> {
  const input = crearCasoSchema.parse(req.body);
  res.status(StatusCodes.CREATED).json({ id: await comunicacionService.crearCaso(ctx(req), input) });
}

export async function getCaso(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.obtenerCaso(ctx(req), requireUuidParam(req, 'id')));
}

export async function postRespuestaCaso(req: Request, res: Response): Promise<void> {
  const { texto } = respuestaSchema.parse(req.body);
  await comunicacionService.responderCasoFamiliar(ctx(req), requireUuidParam(req, 'id'), texto);
  res.status(StatusCodes.CREATED).end();
}

export async function getPropuestas(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.listarPropuestas(ctx(req)));
}

export async function postPropuesta(req: Request, res: Response): Promise<void> {
  const input = crearPropuestaSchema.parse(req.body);
  res.status(StatusCodes.CREATED).json(await comunicacionService.crearPropuesta(ctx(req), input));
}

// ─── App de residentes: "Mi familia" ─────────────────────────────────────────

export async function getHilosResidente(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.hilosDelResidente(requireUser(req)));
}

export async function getMensajesResidente(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.mensajesDelResidente(requireUser(req), requireUuidParam(req, 'vinculoId')));
}

export async function postMensajeResidente(req: Request, res: Response): Promise<void> {
  const { contenido } = mensajeSchema.parse(req.body ?? {});
  const mensaje = await comunicacionService.responderResidente(requireUser(req), requireUuidParam(req, 'vinculoId'), contenido);
  res.status(StatusCodes.CREATED).json(mensaje);
}
