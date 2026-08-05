import { logger } from './logger';

/**
 * Envuelve una función de repository con el mismo log call/error que ya
 * repetía cada función a mano (`logger.info('repo:call', …)` / try-catch +
 * `logger.error('repo:error', …)`) — mismo shape de log, una sola vez.
 */
export function withRepoLogging<A extends unknown[], R>(
  repository: string,
  action: string,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    logger.info('repo:call', { repository, action, args });
    try {
      return await fn(...args);
    } catch (err) {
      logger.error('repo:error', { repository, action, error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  };
}
