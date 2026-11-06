import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as accesoService from '../services/familia/FamiliaAccesoService';
import { aprobarSolicitudSchema, solicitarAccesoSchema, verificarEmailSchema } from '../validators/familia.validators';
import { requireUser, requireUuidParam } from '../utils/validators';

// ─── Público: pantalla de entrada de la app de familiares ────────────────────

export async function postVerificar(req: Request, res: Response): Promise<void> {
  const { email } = verificarEmailSchema.parse(req.body);
  res.json(await accesoService.verificarEmail(email));
}

export async function postSolicitar(req: Request, res: Response): Promise<void> {
  const input = solicitarAccesoSchema.parse(req.body);
  await accesoService.solicitarAcceso(input);
  // Se contesta lo mismo si el pedido es nuevo o un reintento: no hace falta que el cliente lo distinga.
  res.status(StatusCodes.CREATED).json({ ok: true });
}

// ─── Backoffice ──────────────────────────────────────────────────────────────

export async function getSolicitudes(req: Request, res: Response): Promise<void> {
  res.json(await accesoService.listarSolicitudes(requireUser(req)));
}

export async function postAprobar(req: Request, res: Response): Promise<void> {
  const datos = aprobarSolicitudSchema.parse(req.body);
  res.json(await accesoService.aprobarSolicitud(requireUser(req), requireUuidParam(req, 'id'), datos));
}

export async function postRechazar(req: Request, res: Response): Promise<void> {
  await accesoService.rechazarSolicitud(requireUser(req), requireUuidParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}
