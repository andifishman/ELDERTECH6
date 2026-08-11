import { ProviderFatalError, ProviderRateLimitedError, type IProvider } from '../../core/provider';
import type { SearchInput, SearchOutput } from './SearchTypes';

const TAVILY_URL = 'https://api.tavily.com/search';
const EXTRACTO_MAX_CHARS = 300;

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
}

interface TavilyResponse {
  answer?: string | null;
  results?: TavilyResult[];
}

/**
 * Tavily manda la fecha en RFC 1123 ("Sat, 08 Aug 2026 12:00:00 GMT") cuando
 * el topic es 'news'. Se normaliza a YYYY-MM-DD para que el modelo pueda
 * comparar fechas entre fuentes y quedarse con la más nueva.
 */
function normalizarFecha(raw: string): string {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

/**
 * Búsqueda web para la herramienta `buscar_informacion_externa` del asistente.
 * Tavily está pensado para agentes de IA: devuelve un `answer` ya sintetizado
 * más las fuentes, en vez de HTML crudo que el modelo tendría que interpretar
 * — reduce el riesgo de respuestas largas/técnicas para un público que
 * necesita texto simple y corto.
 */
export class TavilySearchProvider implements IProvider<SearchInput, SearchOutput> {
  readonly name = 'tavily';

  constructor(
    private readonly apiKey: string,
    readonly tier: number,
  ) {}

  async call(input: SearchInput): Promise<SearchOutput> {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.apiKey,
        query: input.consulta,
        // `advanced` extrae más contexto de cada página: con `basic` el
        // extracto llegaba tan recortado que el modelo completaba los huecos
        // inventando (goleadores, cifras). Más contexto real = menos invento.
        search_depth: 'advanced',
        include_answer: true,
        max_results: 5,
        // topic 'news' es lo único que hace que Tavily ordene por fecha y
        // devuelva published_date; sin esto, "el último partido" devolvía
        // tranquilamente uno de hace meses.
        ...(input.soloReciente ? { topic: 'news', days: 30 } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ProviderFatalError(this.name, `Tavily key inválida o expirada: ${errText}`);
      }
      if (res.status === 429 || res.status === 432 || res.status === 433) {
        throw new ProviderRateLimitedError(this.name, `Tavily ${res.status}: ${errText}`);
      }
      throw new Error(`Tavily respondió ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as TavilyResponse;

    return {
      respuesta: data.answer && data.answer.trim().length > 0 ? data.answer.trim() : null,
      fuentes: (data.results ?? [])
        .filter((r): r is TavilyResult & { url: string } => Boolean(r.url))
        .map((r) => ({
          titulo: r.title?.trim() || r.url,
          url: r.url,
          extracto: (r.content ?? '').trim().slice(0, EXTRACTO_MAX_CHARS),
          ...(r.published_date ? { fecha: normalizarFecha(r.published_date) } : {}),
        })),
    };
  }
}
