import { supabase } from '@/lib/supabase';
import type { Faq } from '@/types/backoffice.types';
import { registrarAuditoria } from './auditService';

export interface FaqInput {
  pregunta: string;
  categoria?: string | null;
  emoji?: string | null;
  activo: boolean;
}

export async function listarFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase
    .from('faq_asistente')
    .select('*')
    .order('orden', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Faq[];
}

export async function crearFaq(input: FaqInput): Promise<string> {
  // orden = al final de la lista
  const { data: last } = await supabase
    .from('faq_asistente')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();
  const orden = ((last as any)?.orden ?? 0) + 1;

  const { data, error } = await supabase
    .from('faq_asistente')
    .insert({ ...input, orden })
    .select('id')
    .single();
  if (error) throw error;
  await registrarAuditoria({ accion: 'crear', tabla: 'faq_asistente', registroId: data.id, descripcion: `Creó FAQ: "${input.pregunta}"` });
  return data.id;
}

export async function actualizarFaq(id: string, input: FaqInput): Promise<void> {
  const { error } = await supabase.from('faq_asistente').update({ ...input }).eq('id', id);
  if (error) throw error;
  await registrarAuditoria({ accion: 'editar', tabla: 'faq_asistente', registroId: id, descripcion: `Editó FAQ: "${input.pregunta}"` });
}

export async function eliminarFaq(id: string, pregunta?: string): Promise<void> {
  const { error } = await supabase.from('faq_asistente').delete().eq('id', id);
  if (error) throw error;
  await registrarAuditoria({ accion: 'eliminar', tabla: 'faq_asistente', registroId: id, descripcion: `Eliminó FAQ: "${pregunta ?? id}"` });
}

export async function reordenarFaq(faqs: { id: string; orden: number }[]): Promise<void> {
  await Promise.all(
    faqs.map(({ id, orden }) => supabase.from('faq_asistente').update({ orden }).eq('id', id)),
  );
}

export interface MensajeHistorial {
  id: string;
  contenido: string;
  created_at: string;
  residente_nombre: string | null;
  residente_apellido: string | null;
  residente_foto: string | null;
}

export async function obtenerHistorialMensajes(limite = 50): Promise<MensajeHistorial[]> {
  const { data, error } = await supabase
    .from('mensajes_asistente')
    .select('id, contenido, created_at, residente:residentes(nombre, apellido, foto_url)')
    .eq('rol', 'usuario')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map((m: any) => ({
    id: m.id,
    contenido: m.contenido,
    created_at: m.created_at,
    residente_nombre: m.residente?.nombre ?? null,
    residente_apellido: m.residente?.apellido ?? null,
    residente_foto: m.residente?.foto_url ?? null,
  }));
}

function normalizarTexto(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ').trim();
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
    for (let j = 1; j <= b.length; j++)
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    prev = curr;
  }
  return prev[b.length];
}

function sonSimilares(a: string, b: string): boolean {
  if (claveAgrupacion(a) === claveAgrupacion(b)) return true;
  const na = normalizarTexto(a), nb = normalizarTexto(b);
  const maxLen = Math.max(na.length, nb.length);
  // permite hasta 2 ediciones o el 15% del largo, lo que sea menor
  return maxLen > 0 && levenshtein(na, nb) <= Math.min(2, Math.floor(maxLen * 0.15));
}

export interface AsistenteStats {
  totalConsultas: number;
  sesionesHoy: number;
  topPreguntas: { pregunta: string; total: number }[];
}

export async function obtenerStatsAsistente(): Promise<AsistenteStats> {
  try {
    const hoy = new Date().toISOString().slice(0, 10);

    const [{ count: totalConsultas }, { count: sesionesHoy }, { data: topData }] = await Promise.all([
      supabase
        .from('mensajes_asistente')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'usuario'),
      supabase
        .from('mensajes_asistente')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'usuario')
        .gte('created_at', `${hoy}T00:00:00.000Z`)
        .lte('created_at', `${hoy}T23:59:59.999Z`),
      supabase
        .from('mensajes_asistente')
        .select('contenido')
        .eq('rol', 'usuario')
        .limit(500),
    ]);

    // top preguntas agrupadas por similitud
    const conteo = new Map<string, number>();
    (topData ?? []).forEach((m: any) => {
      const k = (m.contenido as string)?.trim();
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

    return {
      totalConsultas: totalConsultas ?? 0,
      sesionesHoy: sesionesHoy ?? 0,
      topPreguntas,
    };
  } catch {
    return { totalConsultas: 0, sesionesHoy: 0, topPreguntas: [] };
  }
}
