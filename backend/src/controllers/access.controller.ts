import type { Request, Response } from 'express';
import * as accessService from '../services/access/AccessService';
import { guardarPermisosSchema } from '../validators/access.validators';
import { requireParam, requireUser } from '../utils/validators';

export async function getMisPermisos(req: Request, res: Response): Promise<void> {
  res.json(await accessService.obtenerMisPermisos(requireUser(req)));
}

export async function getModulos(_req: Request, res: Response): Promise<void> {
  res.json(await accessService.listarModulos());
}

export async function getUsuarios(_req: Request, res: Response): Promise<void> {
  res.json(await accessService.listarUsuarios());
}

export async function putPermisos(req: Request, res: Response): Promise<void> {
  const { permisos } = guardarPermisosSchema.parse(req.body);
  res.json(await accessService.guardarPermisos(requireUser(req), requireParam(req, 'id'), permisos));
}
