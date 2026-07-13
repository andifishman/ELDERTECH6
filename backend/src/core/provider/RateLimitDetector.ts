import { ProviderRateLimitedError } from './Provider';

export type RateLimitPredicate = (error: unknown) => boolean;

interface HttpLikeError {
  status?: number;
  statusCode?: number;
}

/**
 * Detección por defecto de "el vendor me cortó por cuota": nuestro propio
 * `ProviderRateLimitedError`, o un status HTTP 429 colgado del error (la
 * mayoría de los clientes HTTP livianos adjuntan `status`/`statusCode`).
 * Cada `ProviderManager` puede pasar un predicate distinto si un vendor
 * señaliza rate-limit de otra forma (ej. un código de error propio en el body).
 */
export const defaultRateLimitPredicate: RateLimitPredicate = (error) => {
  if (error instanceof ProviderRateLimitedError) return true;
  const httpError = error as HttpLikeError;
  return httpError?.status === 429 || httpError?.statusCode === 429;
};
