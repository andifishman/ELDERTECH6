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

    // top preguntas por frecuencia
    const conteo = new Map<string, number>();
    (topData ?? []).forEach((m: any) => {
      const k = (m.contenido as string)?.trim();
      if (k) conteo.set(k, (conteo.get(k) ?? 0) + 1);
    });
    const topPreguntas = Array.from(conteo.entries())
      .map(([pregunta, total]) => ({ pregunta, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalConsultas: totalConsultas ?? 0,
      sesionesHoy: sesionesHoy ?? 0,
      topPreguntas,
    };
  } catch {
    return { totalConsultas: 0, sesionesHoy: 0, topPreguntas: [] };
  }
}
