/**
 * Abstracción de cache. Se usa tanto para cachear respuestas (clima, radio,
 * tutoriales) como para guardar el estado compartido de los circuit breakers
 * y las métricas de providers — por eso vive en su propia capa, no adentro
 * del framework de providers.
 */
export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  /** Incrementa un contador atómicamente y le pone TTL en el primer incremento. Usado por el rate limiter inbound. */
  increment(key: string, ttlSeconds: number): Promise<number>;
}
