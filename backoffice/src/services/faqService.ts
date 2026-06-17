// ========================================
// SERVICIO: FAQ + estadísticas del asistente
// DESCRIPCIÓN:
// CRUD de las preguntas frecuentes que alimentan al
// asistente IA, y métricas de uso (consultas, sin
// responder, tiempo de respuesta).
// ========================================
import { supabase, ORG_ID } from '@/lib/supabase';
import type { Faq } from '@/types/backoffice.types';
import { registrarAuditoria } from './auditService';

export interface FaqInput {
  pregunta: string;
  respuesta: string;
  categoria?: string | null;
  activo: boolean;
}

export async function listarFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase
    .from('faq')
    .select('*')
    .or(`organizacion_id.is.null,organizacion_id.eq.${ORG_ID}`)
    .order('orden', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Faq[];
}

export async function crearFaq(input: FaqInput): Promise<string> {
  const { data, error } = await supabase
    .from('faq')
    .insert({ ...input, organizacion_id: ORG_ID, veces_consultada: 0, orden: 0 })
    .select('id')
    .single();
  if (error) throw error;
  await registrarAuditoria({ accion: 'crear', tabla: 'faq', registroId: data.id, descripcion: `Creó FAQ: "${input.pregunta}"` });
  return data.id;
}

export async function actualizarFaq(id: string, input: FaqInput): Promise<void> {
  const { error } = await supabase.from('faq').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  await registrarAuditoria({ accion: 'editar', tabla: 'faq', registroId: id, descripcion: `Editó FAQ: "${input.pregunta}"` });
}

export async function eliminarFaq(id: string, pregunta?: string): Promise<void> {
  const { error } = await supabase.from('faq').delete().eq('id', id);
  if (error) throw error;
  await registrarAuditoria({ accion: 'eliminar', tabla: 'faq', registroId: id, descripcion: `Eliminó FAQ: "${pregunta ?? id}"` });
}

export interface AsistenteStats {
  totalConsultas: number;
  sinResponder: number;
  promedioMs: number | null;
  topPreguntas: { pregunta: string; total: number }[];
}

export async function obtenerStatsAsistente(): Promise<AsistenteStats> {
  try {
    const { data } = await supabase
      .from('assistant_logs')
      .select('pregunta, fue_respondida, ms_respuesta')
      .eq('organizacion_id', ORG_ID)
      .limit(1000);

    const logs = data ?? [];
    const sinResponder = logs.filter((l: any) => l.fue_respondida === false).length;
    const tiempos = logs.map((l: any) => l.ms_respuesta).filter((m: any): m is number => typeof m === 'number');
    const promedioMs = tiempos.length ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : null;

    const conteo = new Map<string, number>();
    logs.forEach((l: any) => conteo.set(l.pregunta, (conteo.get(l.pregunta) ?? 0) + 1));
    const topPreguntas = Array.from(conteo.entries())
      .map(([pregunta, total]) => ({ pregunta, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { totalConsultas: logs.length, sinResponder, promedioMs, topPreguntas };
  } catch {
    return { totalConsultas: 0, sinResponder: 0, promedioMs: null, topPreguntas: [] };
  }
}
