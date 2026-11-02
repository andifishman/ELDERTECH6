import type { Request, Response } from 'express';
import * as residentsAdminService from '../services/residents/ResidentsAdminService';
import { crearUsuarioSchema, residenteAdminInputSchema, resetearPasswordSchema, setActivoSchema } from '../validators/residentsAdmin.validators';
import { requireUuidParam, requireToken, requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function getResidentes(req: Request, res: Response): Promise<void> {
  res.json(await residentsAdminService.listar(requireUser(req)));
}

export async function postUsuario(req: Request, res: Response): Promise<void> {
  const input = crearUsuarioSchema.parse(req.body);
  const result = await residentsAdminService.crearUsuario(requireUser(req), requireToken(req), input);
  res.status(StatusCodes.CREATED).json(result);
}

export async function patchResidente(req: Request, res: Response): Promise<void> {
  const input = residenteAdminInputSchema.parse(req.body);
  await residentsAdminService.actualizar(requireUser(req), requireUuidParam(req, 'id'), input);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function postResetPassword(req: Request, res: Response): Promise<void> {
  const { dni } = resetearPasswordSchema.parse(req.body);
  await residentsAdminService.resetearPassword(requireUser(req), requireToken(req), requireUuidParam(req, 'id'), dni);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function getDetalle(req: Request, res: Response): Promise<void> {
  res.json(await residentsAdminService.obtenerDetalle(requireUuidParam(req, 'id')));
}

export async function deleteResidente(req: Request, res: Response): Promise<void> {
  await residentsAdminService.eliminar(requireUser(req), requireUuidParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function patchActivo(req: Request, res: Response): Promise<void> {
  const { activo, nombre } = setActivoSchema.parse(req.body);
  await residentsAdminService.setActivo(requireUser(req), requireUuidParam(req, 'id'), activo, nombre);
  res.status(StatusCodes.NO_CONTENT).end();
}
