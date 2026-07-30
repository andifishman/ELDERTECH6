import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/gamesRepository';

export async function registrarPartida(user: AuthUser, juego: repo.Juego, resultado: repo.ResultadoPartida | null): Promise<void> {
  if (!user.residenteId) throw new HttpError(403, 'Este usuario no tiene un residente asociado.');
  if (!user.organizacionId) throw new HttpError(403, 'Este usuario no tiene una organización asociada.');
  await repo.registrarPartida(user.residenteId, user.organizacionId, juego, resultado);
}
