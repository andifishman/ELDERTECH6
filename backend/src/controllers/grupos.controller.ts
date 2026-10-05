import type { Request, Response } from 'express';
import * as gruposService from '../services/grupos/GruposService';
import { actualizarGrupoSchema, agregarMiembrosSchema, crearGrupoSchema } from '../validators/grupos.validators';
import { requireParam, requireUser } from '../utils/validators';

export async function getListado(req: Request, res: Response): Promise<void> {
  res.json(await gruposService.listar(requireUser(req)));
}

export async function getDetalle(req: Request, res: Response): Promise<void> {
  res.json(await gruposService.obtenerDetalle(requireParam(req, 'id')));
}

export async function getDisponibles(req: Request, res: Response): Promise<void> {
  res.json(await gruposService.residentesDisponibles(requireUser(req), requireParam(req, 'id')));
}

export async function postCrear(req: Request, res: Response): Promise<void> {
  const { nombre, descripcion, residenteIds } = crearGrupoSchema.parse(req.body);
  const grupo = await gruposService.crear(requireUser(req), nombre, descripcion ?? null, residenteIds);
  res.status(201).json(grupo);
}

export async function patchActualizar(req: Request, res: Response): Promise<void> {
  const cambios = actualizarGrupoSchema.parse(req.body);
  res.json(await gruposService.actualizar(requireUser(req), requireParam(req, 'id'), cambios));
}

export async function deleteEliminar(req: Request, res: Response): Promise<void> {
  await gruposService.eliminar(requireUser(req), requireParam(req, 'id'));
  res.status(204).end();
}

export async function postAgregarMiembros(req: Request, res: Response): Promise<void> {
  const { residenteIds } = agregarMiembrosSchema.parse(req.body);
  await gruposService.agregarMiembros(requireUser(req), requireParam(req, 'id'), residenteIds);
  res.status(204).end();
}

export async function deleteMiembro(req: Request, res: Response): Promise<void> {
  await gruposService.quitarMiembro(requireUser(req), requireParam(req, 'id'), requireParam(req, 'residenteId'));
  res.status(204).end();
}
