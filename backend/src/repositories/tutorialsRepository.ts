import { getSupabaseAdmin } from './supabaseAdmin';
import type {
  CategoriaTutorial,
  ProgresoTutorial,
  Tutorial,
  TutorialAdmin,
  TutorialAdminInput,
  TutorialConProgreso,
  PasoTutorial,
} from '../providers/tutorials/TutorialTypes';

const TUTORIAL_SELECT = '*, categoria:categorias_tutorial(id, nombre, emoji, orden, activo)';

export async function getCategorias(): Promise<CategoriaTutorial[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('categorias_tutorial')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (error) throw new Error(`Error al cargar categorías: ${error.message}`);
  return (data ?? []) as CategoriaTutorial[];
}

/** Porteo de `getTutorialesConProgreso` (src/services/tutorialesService.ts) — LEFT JOIN aplanado al residente. */
export async function getTutorialesConProgreso(residenteId: string | null, categoriaId?: string | null): Promise<TutorialConProgreso[]> {
  let query = getSupabaseAdmin()
    .from('tutoriales')
    .select(`${TUTORIAL_SELECT}, progreso:progreso_tutorial(*)`)
    .eq('activo', true)
    .is('deleted_at', null)
    .order('orden', { ascending: true });

  if (categoriaId) query = query.eq('categoria_id', categoriaId);

  const { data, error } = await query;
  if (error) throw new Error(`Error al cargar tutoriales: ${error.message}`);

  return ((data ?? []) as unknown as Array<Tutorial & { categoria: CategoriaTutorial | null; progreso: ProgresoTutorial[] | ProgresoTutorial | null }>).map(
    (t) => ({
      ...t,
      progreso: Array.isArray(t.progreso) ? (t.progreso.find((p) => p.residente_id === residenteId) ?? null) : (t.progreso ?? null),
    }),
  );
}

export async function getTutorialById(id: string, residenteId: string | null): Promise<TutorialConProgreso | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('tutoriales')
    .select(`${TUTORIAL_SELECT}, progreso:progreso_tutorial(*)`)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Error al cargar tutorial: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as Tutorial & { categoria: CategoriaTutorial | null; progreso: ProgresoTutorial[] | null };
  const progreso = Array.isArray(row.progreso) ? (row.progreso.find((p) => p.residente_id === residenteId) ?? null) : null;
  return { ...row, progreso };
}

export async function getTutorialesRelacionados(tutorialId: string, categoriaId: string | null, limit = 3): Promise<Tutorial[]> {
  if (!categoriaId) return [];

  const { data, error } = await getSupabaseAdmin()
    .from('tutoriales')
    .select(TUTORIAL_SELECT)
    .eq('activo', true)
    .is('deleted_at', null)
    .eq('categoria_id', categoriaId)
    .neq('id', tutorialId)
    .order('orden', { ascending: true })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as unknown as Tutorial[];
}

export async function getPasos(tutorialId: string): Promise<PasoTutorial[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('pasos_tutorial')
    .select('*')
    .eq('tutorial_id', tutorialId)
    .order('orden', { ascending: true });

  if (error) throw new Error(`Error al cargar pasos: ${error.message}`);
  return (data ?? []) as PasoTutorial[];
}

export interface ProgresoUpdates {
  favorito?: boolean;
  completado?: boolean;
  segundos_vistos?: number;
  ultima_vista?: string;
}

export async function upsertProgreso(residenteId: string, tutorialId: string, updates: ProgresoUpdates): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('progreso_tutorial')
    .upsert(
      { residente_id: residenteId, tutorial_id: tutorialId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'residente_id,tutorial_id' },
    );

  if (error) throw new Error(`Error al guardar progreso: ${error.message}`);
}

export async function getHistorial(residenteId: string, limit = 5): Promise<TutorialConProgreso[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('progreso_tutorial')
    .select(`*, tutorial:tutoriales(${TUTORIAL_SELECT})`)
    .eq('residente_id', residenteId)
    .not('ultima_vista', 'is', null)
    .order('ultima_vista', { ascending: false })
    .limit(limit);

  if (error) return [];

  return ((data ?? []) as unknown as Array<{ tutorial: Tutorial & { categoria: CategoriaTutorial | null }; [key: string]: unknown }>).map((p) => ({
    ...p.tutorial,
    progreso: p as unknown as ProgresoTutorial,
  }));
}

export async function getFavoritos(residenteId: string): Promise<TutorialConProgreso[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('progreso_tutorial')
    .select(`*, tutorial:tutoriales(${TUTORIAL_SELECT})`)
    .eq('residente_id', residenteId)
    .eq('favorito', true);

  if (error) return [];

  return ((data ?? []) as unknown as Array<{ tutorial: Tutorial & { categoria: CategoriaTutorial | null }; [key: string]: unknown }>).map((p) => ({
    ...p.tutorial,
    progreso: p as unknown as ProgresoTutorial,
  }));
}

export interface TutorialParaIA {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  duracion: string;
}

interface TutorialRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  duracion_segundos: number | null;
  categoria?: { nombre?: string } | null;
}

function formatearDuracion(segundos: number | null): string {
  if (!segundos) return '';
  return `${Math.ceil(segundos / 60)} min`;
}

/**
 * Búsqueda de texto libre de tutoriales — usada por la herramienta
 * `buscar_tutoriales` del asistente. Porteo de `buscarTutorialesPorTexto`
 * (src/services/tutorialesService.ts), ahora con búsqueda `ilike` server-side.
 */
export async function searchTutorialsByText(busqueda: string): Promise<TutorialParaIA[]> {
  let query = getSupabaseAdmin()
    .from('tutoriales')
    .select('id, titulo, descripcion, duracion_segundos, categoria:categorias_tutorial(nombre)')
    .eq('activo', true)
    .order('orden', { ascending: true });

  const trimmed = busqueda.trim();
  if (trimmed) {
    query = query.or(`titulo.ilike.%${trimmed}%,descripcion.ilike.%${trimmed}%`);
  }

  const { data, error } = await query.limit(5);
  if (error) return [];

  return ((data ?? []) as unknown as TutorialRow[]).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion ?? '',
    categoria: t.categoria?.nombre ?? '',
    duracion: formatearDuracion(t.duracion_segundos),
  }));
}

// ─── Admin (backoffice) ──────────────────────────────────────────────────────
// Porteo de `backoffice/src/services/articulosService.ts`.

export async function listarTodosAdmin(): Promise<TutorialAdmin[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('tutoriales')
    .select(TUTORIAL_SELECT)
    .is('deleted_at', null)
    .order('orden', { ascending: true });

  if (error) {
    // Columna deleted_at no existe aún — fallback sin filtro (paridad con el original)
    const { data: fallback, error: err2 } = await getSupabaseAdmin().from('tutoriales').select(TUTORIAL_SELECT).order('orden', { ascending: true });
    if (err2) throw new Error(`Error al cargar tutoriales: ${err2.message}`);
    return (fallback ?? []) as unknown as TutorialAdmin[];
  }
  return (data ?? []) as unknown as TutorialAdmin[];
}

/** Lista la papelera y de paso purga (borra definitivo) lo que lleva más de 7 días ahí. */
export async function listarEliminadosAdmin(): Promise<TutorialAdmin[]> {
  const expirado = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data: viejos } = await getSupabaseAdmin().from('tutoriales').select('id').not('deleted_at', 'is', null).lt('deleted_at', expirado);
    if (viejos && viejos.length > 0) {
      const ids = viejos.map((t) => t.id as string);
      await getSupabaseAdmin().from('pasos_tutorial').delete().in('tutorial_id', ids);
      await getSupabaseAdmin().from('tutoriales').delete().in('id', ids);
    }
  } catch {
    // best-effort, igual que el original
  }

  const { data, error } = await getSupabaseAdmin()
    .from('tutoriales')
    .select(TUTORIAL_SELECT)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as TutorialAdmin[];
}

export async function crearCategoriaTutorial(nombre: string, emoji: string | null): Promise<string> {
  const { data: ultima } = await getSupabaseAdmin().from('categorias_tutorial').select('orden').order('orden', { ascending: false }).limit(1).maybeSingle();
  const orden = ((ultima as { orden?: number } | null)?.orden ?? 0) + 1;

  const { data, error } = await getSupabaseAdmin().from('categorias_tutorial').insert({ nombre, emoji, orden, activo: true }).select('id').single();
  if (error) throw new Error(`Error al crear categoría: ${error.message}`);
  return data.id as string;
}

export async function obtenerAdminPorId(id: string): Promise<TutorialAdmin | null> {
  const { data, error } = await getSupabaseAdmin().from('tutoriales').select(TUTORIAL_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar tutorial: ${error.message}`);
  return (data as unknown as TutorialAdmin) ?? null;
}

async function sincronizarPasosAdmin(tutorialId: string, pasos: TutorialAdminInput['pasos']): Promise<void> {
  await getSupabaseAdmin().from('pasos_tutorial').delete().eq('tutorial_id', tutorialId);
  if (pasos && pasos.length > 0) {
    const { error } = await getSupabaseAdmin()
      .from('pasos_tutorial')
      .insert(pasos.map((p) => ({ ...p, tutorial_id: tutorialId })));
    if (error) throw new Error(`Error al guardar los pasos: ${error.message}`);
  }
}

async function siguienteOrden(): Promise<number> {
  const { data } = await getSupabaseAdmin().from('tutoriales').select('orden').order('orden', { ascending: false }).limit(1).maybeSingle();
  return ((data as { orden?: number } | null)?.orden ?? 0) + 1;
}

export async function crearTutorialAdmin(input: TutorialAdminInput): Promise<string> {
  const { pasos, ...resto } = input;
  const orden = await siguienteOrden();
  const { data, error } = await getSupabaseAdmin().from('tutoriales').insert({ ...resto, orden }).select('id').single();
  if (error) throw new Error(`Error al crear tutorial: ${error.message}`);

  if (pasos && pasos.length > 0) await sincronizarPasosAdmin(data.id as string, pasos);
  return data.id as string;
}

export async function actualizarTutorialAdmin(id: string, input: TutorialAdminInput): Promise<void> {
  const { pasos, ...resto } = input;
  const { error } = await getSupabaseAdmin()
    .from('tutoriales')
    .update({ ...resto, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar tutorial: ${error.message}`);

  if (pasos !== undefined) await sincronizarPasosAdmin(id, pasos);
}

/** Soft delete — mueve a la papelera. */
export async function eliminarTutorialAdmin(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('tutoriales').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Error al eliminar tutorial: ${error.message}`);
}

export async function restaurarTutorialAdmin(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('tutoriales').update({ deleted_at: null }).eq('id', id);
  if (error) throw new Error(`Error al restaurar tutorial: ${error.message}`);
}

export async function eliminarTutorialDefinitivo(id: string): Promise<void> {
  await getSupabaseAdmin().from('pasos_tutorial').delete().eq('tutorial_id', id);
  const { error } = await getSupabaseAdmin().from('tutoriales').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar definitivamente: ${error.message}`);
}

/** Sube al bucket `tutorial-images` (usado para thumbnails y para imágenes de cada paso, según `carpeta`). */
export async function subirImagenTutorial(carpeta: string, buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'jpg';
  const path = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await getSupabaseAdmin().storage.from('tutorial-images').upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Error al subir la imagen: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('tutorial-images').getPublicUrl(path);
  return data.publicUrl;
}

/** Sube al bucket `tutorial-audio`. */
export async function subirAudioTutorial(buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'mp3';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await getSupabaseAdmin()
    .storage.from('tutorial-audio')
    .upload(path, buffer, { contentType: contentType || 'audio/mpeg', upsert: false });
  if (error) throw new Error(`Error al subir el audio: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('tutorial-audio').getPublicUrl(path);
  return data.publicUrl;
}
