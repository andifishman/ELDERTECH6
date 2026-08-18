import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/gamesRepository';
import { StatusCodes } from 'http-status-codes';

export type { ConteoPorJuego } from '../../repositories/gamesRepository';
export type { EstadisticasPuntaje } from '../../repositories/gamesRepository';
export type { TopPuntaje } from '../../repositories/gamesRepository';

export async function registrarPartida(
  user: AuthUser,
  juego: repo.Juego,
  resultado: repo.ResultadoPartida | null,
  puntos: number | null = null,
): Promise<void> {
  if (!user.residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene un residente asociado.');
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  await repo.registrarPartida(user.residenteId, user.organizacionId, juego, resultado, puntos);
}

/** Conteo de partidas por juego de un residente — usado por ResidentsAdminService en el detalle del residente. */
export async function contarPartidasPorJuego(residenteId: string): Promise<repo.ConteoPorJuego[]> {
  return repo.contarPartidasPorJuego(residenteId);
}

export async function obtenerEstadisticasPuntaje(user: AuthUser, juego: repo.Juego): Promise<repo.EstadisticasPuntaje> {
  if (!user.residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene un residente asociado.');
  return repo.obtenerEstadisticasPuntaje(user.residenteId, juego);
}

/** Top 3 (por defecto) de residentes con mejor puntaje en un juego, dentro de la misma organización. */
export async function obtenerTopPuntajes(user: AuthUser, juego: repo.Juego, limite?: number): Promise<repo.TopPuntaje[]> {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return repo.obtenerTopPuntajes(user.organizacionId, juego, limite);
}
