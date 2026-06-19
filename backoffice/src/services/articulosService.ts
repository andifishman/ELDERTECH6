import { supabase } from '@/lib/supabase';
import type { TutorialConCategoria, CategoriaTutorial, FormatoTutorial, PasoTutorial } from '@/types/database.types';
import { registrarAuditoria } from './auditService';

export interface PasoInput {
  orden: number;
  titulo: string;
  descripcion: string;
  imagen_url: string | null;
  tip: string | null;
}

export interface TutorialInput {
  titulo: string;
  descripcion?: string | null;
  categoria_id?: string | null;
  formato: FormatoTutorial;
  nivel: string;
  url_video?: string | null;
  thumbnail_url?: string | null;
  duracion_segundos?: number | null;
  lo_que_aprenderas?: string[] | null;
  activo: boolean;
  pasos?: PasoInput[];
}

export async function listarArticulos(): Promise<TutorialConCategoria[]> {
  const { data, error } = await supabase
    .from('tutoriales')
    .select('*, categoria:categorias_tutorial(*)')
    .is('deleted_at', null)
    .order('orden', { ascending: true });

  if (error) {
    // Columna deleted_at no existe aún — fallback sin filtro
    const { data: fallback, error: err2 } = await supabase
      .from('tutoriales')
      .select('*, categoria:categorias_tutorial(*)')
      .order('orden', { ascending: true });
    if (err2) throw err2;
    return (fallback ?? []) as unknown as TutorialConCategoria[];
  }

  return (data ?? []) as unknown as TutorialConCategoria[];
}

export async function listarEliminados(): Promise<TutorialConCategoria[]> {
  // Auto-purga: elimina definitivamente tutoriales con más de 7 días en papelera
  const expirado = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data: viejos } = await supabase
      .from('tutoriales')
      .select('id')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', expirado);
    if (viejos && viejos.length > 0) {
      const ids = viejos.map((t: any) => t.id as string);
      await supabase.from('pasos_tutorial').delete().in('tutorial_id', ids);
      await supabase.from('tutoriales').delete().in('id', ids);
    }
  } catch {}

  const { data, error } = await supabase
    .from('tutoriales')
    .select('*, categoria:categorias_tutorial(*)')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as TutorialConCategoria[];
}

export async function listarCategoriasArticulo(): Promise<CategoriaTutorial[]> {
  const { data, error } = await supabase
    .from('categorias_tutorial')
    .select('*')
    .eq('activo', true)
    .order('orden');
  if (error) throw error;
  return (data ?? []) as CategoriaTutorial[];
}

export async function obtenerArticulo(id: string): Promise<TutorialConCategoria | null> {
  const { data, error } = await supabase
    .from('tutoriales')
    .select('*, categoria:categorias_tutorial(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as TutorialConCategoria) ?? null;
}

export async function listarPasos(tutorialId: string): Promise<PasoTutorial[]> {
  const { data, error } = await supabase
    .from('pasos_tutorial')
    .select('*')
    .eq('tutorial_id', tutorialId)
    .order('orden', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PasoTutorial[];
}

async function sincronizarPasos(tutorialId: string, pasos: PasoInput[]) {
  await supabase.from('pasos_tutorial').delete().eq('tutorial_id', tutorialId);
  if (pasos.length > 0) {
    await supabase.from('pasos_tutorial').insert(
      pasos.map((p) => ({ ...p, tutorial_id: tutorialId })),
    );
  }
}

// Obtiene el siguiente valor de orden para un nuevo tutorial
async function siguienteOrden(): Promise<number> {
  const { data } = await supabase
    .from('tutoriales')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as any)?.orden ?? 0) + 1;
}

export async function crearArticulo(input: TutorialInput): Promise<string> {
  const { pasos, ...resto } = input;
  const orden = await siguienteOrden();
  const { data, error } = await supabase
    .from('tutoriales')
    .insert({ ...resto, orden })
    .select('id')
    .single();
  if (error) throw error;

  if (pasos && pasos.length > 0) {
    await sincronizarPasos(data.id, pasos);
  }

  await registrarAuditoria({
    accion: input.activo ? 'publicar' : 'crear',
    tabla: 'tutoriales',
    registroId: data.id,
    descripcion: `${input.activo ? 'Publicó' : 'Creó borrador de'} "${input.titulo}"`,
  });
  return data.id;
}

export async function actualizarArticulo(id: string, input: TutorialInput): Promise<void> {
  const { pasos, ...resto } = input;
  const { error } = await supabase
    .from('tutoriales')
    .update({ ...resto, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  if (pasos !== undefined) {
    await sincronizarPasos(id, pasos);
  }

  await registrarAuditoria({
    accion: 'editar',
    tabla: 'tutoriales',
    registroId: id,
    descripcion: `Editó "${input.titulo}"`,
  });
}

// Soft delete: mueve a la papelera
export async function eliminarArticulo(id: string, titulo?: string): Promise<void> {
  const { error } = await supabase
    .from('tutoriales')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await registrarAuditoria({
    accion: 'eliminar',
    tabla: 'tutoriales',
    registroId: id,
    descripcion: `Movió a papelera "${titulo ?? id}"`,
  });
}

// Restaurar desde la papelera
export async function restaurarArticulo(id: string, titulo?: string): Promise<void> {
  const { error } = await supabase
    .from('tutoriales')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
  await registrarAuditoria({
    accion: 'editar',
    tabla: 'tutoriales',
    registroId: id,
    descripcion: `Restauró "${titulo ?? id}" desde la papelera`,
  });
}

// Eliminación definitiva e irreversible
export async function eliminarDefinitivamente(id: string, titulo?: string): Promise<void> {
  await supabase.from('pasos_tutorial').delete().eq('tutorial_id', id);
  const { error } = await supabase.from('tutoriales').delete().eq('id', id);
  if (error) throw error;
  await registrarAuditoria({
    accion: 'eliminar',
    tabla: 'tutoriales',
    registroId: id,
    descripcion: `Eliminó definitivamente "${titulo ?? id}"`,
  });
}

// Sube una imagen al bucket tutorial-images y devuelve la URL pública
export async function subirImagenTutorial(archivo: File, carpeta = 'thumbnails'): Promise<string> {
  const ext = archivo.name.split('.').pop() ?? 'jpg';
  const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('tutorial-images')
    .upload(nombre, archivo, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('tutorial-images').getPublicUrl(nombre);
  return data.publicUrl;
}

// Sube un archivo de audio al bucket tutorial-audio y devuelve la URL pública
export async function subirAudioTutorial(archivo: File): Promise<string> {
  const ext = archivo.name.split('.').pop() ?? 'mp3';
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('tutorial-audio')
    .upload(nombre, archivo, { cacheControl: '3600', upsert: false, contentType: archivo.type || 'audio/mpeg' });
  if (error) throw error;
  const { data } = supabase.storage.from('tutorial-audio').getPublicUrl(nombre);
  return data.publicUrl;
}
