import type { Request, Response } from 'express';
import * as gruposService from '../services/grupos/GruposService';
import { actualizarGrupoSchema, agregarMiembrosSchema, crearGrupoSchema } from '../validators/grupos.validators';
import { requireUuidParam, requireUser } from '../utils/validators';

export async function getListado(req: Request, res: Response): Promise<void> {
  res.json(await gruposService.listar(requireUser(req)));
}

export async function getDetalle(req: Request, res: Response): Promise<void> {
  res.json(await gruposService.obtenerDetalle(requireUuidParam(req, 'id')));
}

export async function getDisponibles(req: Request, res: Response): Promise<void> {
  res.json(await gruposService.residentesDisponibles(requireUser(req), requireUuidParam(req, 'id')));
}

export async function postCrear(req: Request, res: Response): Promise<void> {
  const { nombre, descripcion, residenteIds } = crearGrupoSchema.parse(req.body);
  const grupo = await gruposService.crear(requireUser(req), nombre, descripcion ?? null, residenteIds);
  res.status(201).json(grupo);
}

export async function patchActualizar(req: Request, res: Response): Promise<void> {
  const cambios = actualizarGrupoSchema.parse(req.body);
  res.json(await gruposService.actualizar(requireUser(req), requireUuidParam(req, 'id'), cambios));
}

export async function deleteEliminar(req: Request, res: Response): Promise<void> {
  await gruposService.eliminar(requireUser(req), requireUuidParam(req, 'id'));
  res.status(204).end();
}

export async function postAgregarMiembros(req: Request, res: Response): Promise<void> {
  const { residenteIds } = agregarMiembrosSchema.parse(req.body);
  await gruposService.agregarMiembros(requireUser(req), requireUuidParam(req, 'id'), residenteIds);
  res.status(204).end();
}

export async function deleteMiembro(req: Request, res: Response): Promise<void> {
  await gruposService.quitarMiembro(requireUser(req), requireUuidParam(req, 'id'), requireUuidParam(req, 'residenteId'));
  res.status(204).end();
}
