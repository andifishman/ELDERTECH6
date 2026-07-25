import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as residentsAdminService from '../services/residents/ResidentsAdminService';
import { crearUsuarioSchema, residenteAdminInputSchema, resetearPasswordSchema, setActivoSchema } from '../validators/residentsAdmin.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

function requireToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'No autenticado.');
  return header.slice('Bearer '.length);
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Falta el parámetro ${name}.`);
  return value;
}

export async function getResidentes(req: Request, res: Response): Promise<void> {
  res.json(await residentsAdminService.listar(requireUser(req)));
}

export async function postUsuario(req: Request, res: Response): Promise<void> {
  const input = crearUsuarioSchema.parse(req.body);
  const result = await residentsAdminService.crearUsuario(requireUser(req), requireToken(req), input);
  res.status(201).json(result);
}

export async function patchResidente(req: Request, res: Response): Promise<void> {
  const input = residenteAdminInputSchema.parse(req.body);
  await residentsAdminService.actualizar(requireUser(req), requireParam(req, 'id'), input);
  res.status(204).end();
}

export async function postResetPassword(req: Request, res: Response): Promise<void> {
  const { dni } = resetearPasswordSchema.parse(req.body);
  await residentsAdminService.resetearPassword(requireUser(req), requireToken(req), requireParam(req, 'id'), dni);
  res.status(204).end();
}

export async function getDetalle(req: Request, res: Response): Promise<void> {
  res.json(await residentsAdminService.obtenerDetalle(requireParam(req, 'id')));
}

export async function patchActivo(req: Request, res: Response): Promise<void> {
  const { activo, nombre } = setActivoSchema.parse(req.body);
  await residentsAdminService.setActivo(requireUser(req), requireParam(req, 'id'), activo, nombre);
  res.status(204).end();
}
