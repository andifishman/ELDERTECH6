// Servicio de tutoriales — queries a Supabase para el módulo Tutoriales
import { supabase } from './supabase';
import type {
  CategoriaTutorial,
  Tutorial,
  TutorialConProgreso,
  PasoTutorial,
  ProgresoTutorial,
} from '@/types/database.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convierte segundos en texto legible: 65 → "1 min", 3600 → "60 min" */
export function formatearDuracion(segundos: number | null): string {
  if (!segundos) return '';
  const min = Math.ceil(segundos / 60);
  return `${min} min`;
}

// ─── Búsqueda para el asistente IA ───────────────────────────────────────────

export interface TutorialParaIA {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  duracion: string;
}

/**
 * Búsqueda de texto libre de tutoriales para el asistente IA.
 * Retorna una lista compacta filtrada por título o descripción.
 */
export async function buscarTutorialesPorTexto(
  busqueda: string,
): Promise<TutorialParaIA[]> {
  let query = supabase
    .from('tutoriales')
    .select('id, titulo, descripcion, duracion_segundos, categoria:categorias_tutorial(nombre)')
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (busqueda.trim()) {
    query = query.or(
      `titulo.ilike.%${busqueda.trim()}%,descripcion.ilike.%${busqueda.trim()}%`,
    );
  }

  const { data, error } = await query.limit(5);
  if (error) return [];

  return (data ?? []).map((t) => ({
    id: t.id as string,
    titulo: t.titulo as string,
    descripcion: (t.descripcion as string | null) ?? '',
    categoria: ((t.categoria as { nombre?: string } | null)?.nombre) ?? '',
    duracion: formatearDuracion(t.duracion_segundos as number | null),
  }));
}

// ─── Categorías ───────────────────────────────────────────────────────────────

export async function getCategoriasTutorial(): Promise<CategoriaTutorial[]> {
  const { data, error } = await supabase
    .from('categorias_tutorial')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (error) throw new Error(`Error al cargar categorías: ${error.message}`);
  return (data ?? []) as CategoriaTutorial[];
}

// ─── Tutoriales ───────────────────────────────────────────────────────────────

const TUTORIAL_SELECT = `
  *,
  categoria:categorias_tutorial(id, nombre, emoji, orden, activo)
`;

/**
 * Devuelve todos los tutoriales activos con su categoría.
 * Opcionalmente filtra por categoría.
 */
export async function getTutoriales(
  categoriaId?: string | null,
): Promise<Tutorial[]> {
  let query = supabase
    .from('tutoriales')
    .select(TUTORIAL_SELECT)
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (categoriaId) {
    query = query.eq('categoria_id', categoriaId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al cargar tutoriales: ${error.message}`);
  return (data ?? []) as Tutorial[];
}

/**
 * Devuelve tutoriales con el progreso del residente ya joinado.
 * Un LEFT JOIN para que aparezcan aunque no tengan progreso.
 * residenteId puede ser null — en ese caso se muestran los tutoriales sin datos de progreso.
 */
export async function getTutorialesConProgreso(
  residenteId: string | null,
  categoriaId?: string | null,
): Promise<TutorialConProgreso[]> {
  let query = supabase
    .from('tutoriales')
    .select(`
      *,
      categoria:categorias_tutorial(id, nombre, emoji, orden, activo),
      progreso:progreso_tutorial(*)
    `)
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (categoriaId) {
    query = query.eq('categoria_id', categoriaId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al cargar tutoriales: ${error.message}`);

  // progreso viene como array por el join — aplanar al item del residente
  return ((data ?? []) as any[]).map((t) => ({
    ...t,
    progreso: Array.isArray(t.progreso)
      ? (t.progreso.find((p: ProgresoTutorial) => p.residente_id === residenteId) ?? null)
      : t.progreso ?? null,
  })) as TutorialConProgreso[];
}

/**
 * Detalle de un tutorial con el progreso del residente incluido.
 * El join devuelve progreso como array — se aplana al registro del residente.
 */
export async function getTutorialById(
  id: string,
  residenteId: string | null,
): Promise<TutorialConProgreso | null> {
  const { data, error } = await supabase
    .from('tutoriales')
    .select(`${TUTORIAL_SELECT}, progreso:progreso_tutorial(*)`)
    .eq('id', id)
    .single();

  if (error) throw new Error(`Error al cargar tutorial: ${error.message}`);
  if (!data) return null;

  const progreso = Array.isArray(data.progreso)
    ? ((data.progreso as ProgresoTutorial[]).find((p) => p.residente_id === residenteId) ?? null)
    : null;

  return { ...data, progreso } as TutorialConProgreso;
}

/**
 * Devuelve tutoriales de la misma categoría (para "Relacionados").
 * Excluye el tutorial actual.
 */
export async function getTutorialesRelacionados(
  tutorialId: string,
  categoriaId: string | null,
  limit = 3,
): Promise<Tutorial[]> {
  if (!categoriaId) return [];

  const { data, error } = await supabase
    .from('tutoriales')
    .select(TUTORIAL_SELECT)
    .eq('activo', true)
    .eq('categoria_id', categoriaId)
    .neq('id', tutorialId)
    .order('orden', { ascending: true })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as Tutorial[];
}

// ─── Pasos de guía ────────────────────────────────────────────────────────────

export async function getPasosTutorial(tutorialId: string): Promise<PasoTutorial[]> {
  const { data, error } = await supabase
    .from('pasos_tutorial')
    .select('*')
    .eq('tutorial_id', tutorialId)
    .order('orden', { ascending: true });

  if (error) throw new Error(`Error al cargar pasos: ${error.message}`);
  return (data ?? []) as PasoTutorial[];
}

// ─── Progreso ─────────────────────────────────────────────────────────────────

export async function getProgreso(
  residenteId: string,
  tutorialId: string,
): Promise<ProgresoTutorial | null> {
  const { data } = await supabase
    .from('progreso_tutorial')
    .select('*')
    .eq('residente_id', residenteId)
    .eq('tutorial_id', tutorialId)
    .maybeSingle();

  return data as ProgresoTutorial | null;
}

/**
 * Registra o actualiza el progreso. Usa upsert para manejar
 * tanto primera visita como actualizaciones posteriores.
 */
export async function upsertProgreso(
  residenteId: string,
  tutorialId: string,
  updates: {
    favorito?: boolean;
    completado?: boolean;
    segundos_vistos?: number;
    ultima_vista?: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from('progreso_tutorial')
    .upsert(
      {
        residente_id: residenteId,
        tutorial_id: tutorialId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'residente_id,tutorial_id' },
    );

  if (error) throw new Error(`Error al guardar progreso: ${error.message}`);
}

/** Registra que el usuario abrió un tutorial (historial). */
export async function registrarVista(
  residenteId: string,
  tutorialId: string,
): Promise<void> {
  await upsertProgreso(residenteId, tutorialId, {
    ultima_vista: new Date().toISOString(),
  });
}

/** Devuelve los últimos N tutoriales vistos por el residente. */
export async function getHistorial(
  residenteId: string,
  limit = 5,
): Promise<TutorialConProgreso[]> {
  const { data, error } = await supabase
    .from('progreso_tutorial')
    .select(`
      *,
      tutorial:tutoriales(
        *,
        categoria:categorias_tutorial(id, nombre, emoji, orden, activo)
      )
    `)
    .eq('residente_id', residenteId)
    .not('ultima_vista', 'is', null)
    .order('ultima_vista', { ascending: false })
    .limit(limit);

  if (error) return [];

  return ((data ?? []) as any[]).map((p) => ({
    ...p.tutorial,
    progreso: p,
  })) as TutorialConProgreso[];
}

/** Devuelve los tutoriales marcados como favoritos. */
export async function getFavoritos(
  residenteId: string,
): Promise<TutorialConProgreso[]> {
  const { data, error } = await supabase
    .from('progreso_tutorial')
    .select(`
      *,
      tutorial:tutoriales(
        *,
        categoria:categorias_tutorial(id, nombre, emoji, orden, activo)
      )
    `)
    .eq('residente_id', residenteId)
    .eq('favorito', true);

  if (error) return [];

  return ((data ?? []) as any[]).map((p) => ({
    ...p.tutorial,
    progreso: p,
  })) as TutorialConProgreso[];
}
