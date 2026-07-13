import { getSupabaseAdmin } from './supabaseAdmin';
import type {
  CategoriaTutorial,
  ProgresoTutorial,
  Tutorial,
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
