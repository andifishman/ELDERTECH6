import type { AuthUser } from '../../middlewares/auth';
import { getCacheStore } from '../../cache';
import * as repo from '../../repositories/gamesRepository';
import { HttpError } from '../../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';

/**
 * Ranking y estadísticas de juegos para el backoffice.
 *
 * Para no cargar la base cada vez que alguien abre la pantalla: la agregación la
 * hace Postgres (funciones ranking_juego / resumen_juegos, con índice) y el
 * resultado se cachea 10 minutos por organización + juego + período. Un
 * botón "Actualizar" en el backoffice puede saltear la caché (`fresh`).
 */
const TTL_SEGUNDOS = 10 * 60;

export type Periodo = 'todo' | 'semana' | 'mes';

function desdeDe(periodo: Periodo): string | null {
  if (periodo === 'todo') return null;
  const dias = periodo === 'semana' ? 7 : 30;
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
}

async function conCache<T>(clave: string, fresh: boolean, calcular: () => Promise<T>): Promise<{ datos: T; generadoEn: string }> {
  const cache = getCacheStore();
  if (!fresh) {
    const guardado = await cache.get<{ datos: T; generadoEn: string }>(clave).catch(() => null);
    if (guardado) return guardado;
  }
  const resultado = { datos: await calcular(), generadoEn: new Date().toISOString() };
  await cache.set(clave, resultado, TTL_SEGUNDOS).catch(() => undefined);
  return resultado;
}

function requireOrg(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

export async function resumen(user: AuthUser, periodo: Periodo, fresh: boolean) {
  const org = requireOrg(user);
  return conCache(`games:resumen:${org}:${periodo}`, fresh, () => repo.resumenJuegos(org, desdeDe(periodo)));
}

export async function ranking(user: AuthUser, juego: repo.Juego, periodo: Periodo, fresh: boolean) {
  const org = requireOrg(user);
  return conCache(`games:ranking:${org}:${juego}:${periodo}`, fresh, () => repo.rankingJuego(org, juego, desdeDe(periodo), 50));
}
