import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/palabrasRepository';
import * as gamesRepo from '../../repositories/gamesRepository';
import { StatusCodes } from 'http-status-codes';

export const TOTAL_NIVELES_PALABRAS = 150;
/** Pistas que se ganan al completar un nivel por primera vez. */
export const PISTAS_POR_NIVEL = 3;

export type { ProgresoPalabras } from '../../repositories/palabrasRepository';

function requireResidente(user: AuthUser): { residenteId: string; organizacionId: string } {
  if (!user.residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene un residente asociado.');
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return { residenteId: user.residenteId, organizacionId: user.organizacionId };
}

export async function obtenerProgreso(user: AuthUser): Promise<repo.ProgresoPalabras> {
  return repo.obtenerProgreso(requireResidente(user).residenteId);
}

/**
 * Marca un nivel como completado. El nivel 1 siempre está disponible; el resto
 * exige haber completado el anterior. Las pistas de premio se dan SOLO la primera
 * vez (rejugar un nivel no regala pistas). Además registra la partida para el
 * ranking: el "puntaje" de Palabras es el nivel alcanzado.
 */
export async function completarNivel(user: AuthUser, nivel: number, pistasUsadas: number): Promise<repo.ProgresoPalabras & { nuevo: boolean }> {
  const { residenteId, organizacionId } = requireResidente(user);

  if (nivel > 1 && !(await repo.nivelCompletado(residenteId, nivel - 1))) {
    throw new HttpError(StatusCodes.FORBIDDEN, `El nivel ${nivel} todavía está bloqueado: hay que completar el nivel ${nivel - 1} primero.`);
  }

  if (await repo.nivelCompletado(residenteId, nivel)) {
    return { ...(await repo.obtenerProgreso(residenteId)), nuevo: false };
  }

  await repo.guardarNivelCompletado(residenteId, organizacionId, nivel, pistasUsadas, PISTAS_POR_NIVEL);
  await gamesRepo.registrarPartida(residenteId, organizacionId, 'palabras', 'ganado', nivel);
  return { ...(await repo.obtenerProgreso(residenteId)), nuevo: true };
}

/** Gasta una pista del saldo. */
export async function usarPista(user: AuthUser): Promise<{ pistas: number }> {
  const { residenteId, organizacionId } = requireResidente(user);
  const pistas = await repo.gastarPista(residenteId, organizacionId);
  if (pistas === null) throw new HttpError(StatusCodes.CONFLICT, 'No te quedan pistas. Ganás 3 más al completar un nivel.');
  return { pistas };
}
