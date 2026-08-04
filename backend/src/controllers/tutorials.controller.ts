import type { Request, Response } from 'express';
import * as tutorialsService from '../services/tutorials/TutorialsService';
import {
  historialQuerySchema,
  listTutorialsQuerySchema,
  progresoSchema,
  relacionadosQuerySchema,
} from '../validators/tutorials.validators';
import { requireParam, requireResidenteId } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function getCategorias(_req: Request, res: Response): Promise<void> {
  res.json(await tutorialsService.getCategorias());
}

export async function getTutoriales(req: Request, res: Response): Promise<void> {
  const { categoriaId } = listTutorialsQuerySchema.parse(req.query);
  res.json(await tutorialsService.getTutoriales(req.user?.residenteId ?? null, categoriaId ?? null));
}

export async function getTutorialById(req: Request, res: Response): Promise<void> {
  const id = requireParam(req, 'id');
  res.json(await tutorialsService.getTutorialById(id, req.user?.residenteId ?? null));
}

export async function getPasos(req: Request, res: Response): Promise<void> {
  res.json(await tutorialsService.getPasos(requireParam(req, 'id')));
}

export async function getRelacionados(req: Request, res: Response): Promise<void> {
  const { categoriaId } = relacionadosQuerySchema.parse(req.query);
  res.json(await tutorialsService.getRelacionados(requireParam(req, 'id'), categoriaId ?? null));
}

export async function postProgreso(req: Request, res: Response): Promise<void> {
  const updates = progresoSchema.parse(req.body);
  await tutorialsService.guardarProgreso(requireResidenteId(req), requireParam(req, 'id'), updates);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function postVista(req: Request, res: Response): Promise<void> {
  await tutorialsService.registrarVista(requireResidenteId(req), requireParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function getHistorial(req: Request, res: Response): Promise<void> {
  const { limit } = historialQuerySchema.parse(req.query);
  res.json(await tutorialsService.getHistorial(requireResidenteId(req), limit));
}

export async function getFavoritos(req: Request, res: Response): Promise<void> {
  res.json(await tutorialsService.getFavoritos(requireResidenteId(req)));
}
