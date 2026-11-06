import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../middlewares/errorHandler';

/** Un residente al que el familiar está vinculado (vínculo activo). */
export interface VinculoFamiliar {
  vinculoId: string;
  residenteId: string;
  parentesco: string | null;
  nombre: string;
  apellido: string;
  seccion: string | null;
}

/** Quién es el familiar autenticado y a qué residentes puede acceder. Lo arma `requireFamiliar`. */
export interface FamiliarContext {
  familiarId: string;
  organizacionId: string;
  nombre: string;
  apellido: string;
  email: string;
  vinculos: VinculoFamiliar[];
}

/**
 * ÚNICA puerta para tocar datos de un residente desde la app de familiares: el residente tiene
 * que estar entre los vinculados del familiar. Si no, 404 (no 403) para no confirmar que existe.
 * Todo servicio que reciba un `residenteId` del cliente tiene que pasar por acá.
 */
export function exigirVinculo(ctx: FamiliarContext, residenteId: string): VinculoFamiliar {
  const vinculo = ctx.vinculos.find((v) => v.residenteId === residenteId);
  if (!vinculo) throw new HttpError(StatusCodes.NOT_FOUND, 'No encontramos a ese residente.');
  return vinculo;
}

/** Igual que `exigirVinculo` pero buscando por el id del vínculo (los hilos de mensajes cuelgan del vínculo). */
export function exigirVinculoPorId(ctx: FamiliarContext, vinculoId: string): VinculoFamiliar {
  const vinculo = ctx.vinculos.find((v) => v.vinculoId === vinculoId);
  if (!vinculo) throw new HttpError(StatusCodes.NOT_FOUND, 'No encontramos esa conversación.');
  return vinculo;
}
