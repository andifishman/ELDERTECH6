import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/assistantRepository';
import * as auditService from '../audit/AuditService';

/** Porteo de `backoffice/src/services/faqService.ts` — operaciones admin-only (backoffice). */

export async function listarFaqs(): Promise<repo.FaqAdmin[]> {
  return repo.listarFaqsAdmin();
}

export async function crearFaq(user: AuthUser, input: repo.FaqAdminInput): Promise<string> {
  const id = await repo.crearFaqAdmin(input);
  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'faq_asistente',
    registroId: id,
    descripcion: `Creó FAQ: "${input.pregunta}"`,
  });
  return id;
}

export async function actualizarFaq(user: AuthUser, id: string, input: repo.FaqAdminInput): Promise<void> {
  await repo.actualizarFaqAdmin(id, input);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'faq_asistente',
    registroId: id,
    descripcion: `Editó FAQ: "${input.pregunta}"`,
  });
}

export async function eliminarFaq(user: AuthUser, id: string, pregunta?: string): Promise<void> {
  await repo.eliminarFaqAdmin(id);
  await auditService.registrarAuditoria(user, {
    accion: 'eliminar',
    tabla: 'faq_asistente',
    registroId: id,
    descripcion: `Eliminó FAQ: "${pregunta ?? id}"`,
  });
}

export async function reordenarFaqs(faqs: { id: string; orden: number }[]): Promise<void> {
  await repo.reordenarFaqAdmin(faqs);
}

export async function obtenerHistorialMensajes(limite?: number): Promise<repo.MensajeHistorial[]> {
  return repo.obtenerHistorialMensajesAdmin(limite);
}

// ─── Stats con clustering de preguntas por similitud (Levenshtein) ───────────
// Porteo textual de `backoffice/src/services/faqService.ts` — pura lógica de
// texto sobre datos ya traídos, no hay razón para llevarla a SQL.

function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function claveAgrupacion(s: string): string {
  // colapsa vocales repetidas: "holaa" → "hola", "holaaa" → "hola"
  return normalizarTexto(s).replace(/([aeiou])\1+/g, '$1');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1]! : 1 + Math.min(prev[j]!, curr[j - 1]!, prev[j - 1]!);
    prev = curr;
  }
  return prev[b.length]!;
}

function sonSimilares(a: string, b: string): boolean {
  if (claveAgrupacion(a) === claveAgrupacion(b)) return true;
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);
  const maxLen = Math.max(na.length, nb.length);
  // permite hasta 2 ediciones o el 15% del largo, lo que sea menor
  return maxLen > 0 && levenshtein(na, nb) <= Math.min(2, Math.floor(maxLen * 0.15));
}

export interface AsistenteStats {
  totalConsultas: number;
  sesionesHoy: number;
  topPreguntas: { pregunta: string; total: number }[];
}

export async function obtenerStats(): Promise<AsistenteStats> {
  try {
    const { totalConsultas, sesionesHoy, contenidos } = await repo.obtenerStatsRaw();

    const conteo = new Map<string, number>();
    contenidos.forEach((c) => {
      const k = c.trim();
      if (k) conteo.set(k, (conteo.get(k) ?? 0) + 1);
    });

    // ordenar de mayor a menor frecuencia para que el más común sea el representante
    const entradas = Array.from(conteo.entries()).sort((a, b) => b[1] - a[1]);
    const grupos: { pregunta: string; total: number }[] = [];
    for (const [texto, cnt] of entradas) {
      const grupo = grupos.find((g) => sonSimilares(g.pregunta, texto));
      if (grupo) grupo.total += cnt;
      else grupos.push({ pregunta: texto, total: cnt });
    }

    const topPreguntas = grupos.sort((a, b) => b.total - a.total).slice(0, 20);

    return { totalConsultas, sesionesHoy, topPreguntas };
  } catch {
    return { totalConsultas: 0, sesionesHoy: 0, topPreguntas: [] };
  }
}
