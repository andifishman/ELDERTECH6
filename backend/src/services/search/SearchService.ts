import { getCacheStore } from '../../cache';
import { env } from '../../config/env';
import { ProviderManager, type IProvider } from '../../core/provider';
import { TavilySearchProvider } from '../../providers/search/TavilySearchProvider';
import type { SearchInput, SearchOutput } from '../../providers/search/SearchTypes';

let searchManager: ProviderManager<SearchInput, SearchOutput> | null | undefined;

function getSearchManager(): ProviderManager<SearchInput, SearchOutput> | null {
  if (searchManager !== undefined) return searchManager;

  if (!env.tavilyApiKey) {
    searchManager = null;
    return searchManager;
  }

  const providers: IProvider<SearchInput, SearchOutput>[] = [new TavilySearchProvider(env.tavilyApiKey, 1)];

  // Slot listo para sumar un segundo vendor de búsqueda si hiciera falta
  // redundancia (mismo patrón que Clima/Chat) — por ahora un solo provider
  // alcanza, no vale la complejidad extra sin un caso real que lo pida.
  searchManager = new ProviderManager(providers, getCacheStore(), {
    timeoutMs: 10_000,
    retriesPerProvider: 1,
  });
  return searchManager;
}

export async function getHealthSnapshot() {
  const manager = getSearchManager();
  return manager ? manager.getHealthSnapshot() : [];
}

/**
 * Búsqueda externa para la herramienta `buscar_informacion_externa` del
 * asistente. Sin cache: la gracia de esta herramienta es traer información
 * actualizada, así que servir una respuesta vieja de cache rompería el
 * propósito.
 */
export async function buscar(consulta: string): Promise<SearchOutput> {
  const manager = getSearchManager();
  if (!manager) throw new Error('Búsqueda externa no configurada (falta TAVILY_API_KEY en el servidor).');
  return manager.execute({ consulta });
}
