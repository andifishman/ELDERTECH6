import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export const PISTAS_INICIALES = 3;

export interface ProgresoPalabras {
  /** Niveles ya completados (el siguiente a jugar es max + 1). */
  nivelesCompletados: number[];
  pistas: number;
}

/** Saldo de pistas; si el residente todavía no tiene fila, arranca con PISTAS_INICIALES. */
async function leerPistas(residenteId: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin().from('palabras_pistas').select('pistas').eq('residente_id', residenteId).maybeSingle();
  if (error) throw new Error(`Error al cargar las pistas: ${error.message}`);
  return data ? (data.pistas as number) : PISTAS_INICIALES;
}

async function guardarPistas(residenteId: string, organizacionId: string, pistas: number): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('palabras_pistas')
    .upsert({ residente_id: residenteId, organizacion_id: organizacionId, pistas, updated_at: new Date().toISOString() }, { onConflict: 'residente_id' });
  if (error) throw new Error(`Error al guardar las pistas: ${error.message}`);
}

export async function obtenerProgreso(residenteId: string): Promise<ProgresoPalabras> {
  logger.info('repo:call', { repository: 'palabrasRepository', action: 'obtenerProgreso', residenteId });
  try {
    const [niveles, pistas] = await Promise.all([
      getSupabaseAdmin().from('palabras_niveles_progreso').select('nivel').eq('residente_id', residenteId).order('nivel', { ascending: true }),
      leerPistas(residenteId),
    ]);
    if (niveles.error) throw new Error(`Error al cargar el progreso: ${niveles.error.message}`);
    return { nivelesCompletados: (niveles.data ?? []).map((f) => f.nivel as number), pistas };
  } catch (err) {
    logger.error('repo:error', { repository: 'palabrasRepository', action: 'obtenerProgreso', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function nivelCompletado(residenteId: string, nivel: number): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('palabras_niveles_progreso')
    .select('id')
    .eq('residente_id', residenteId)
    .eq('nivel', nivel)
    .maybeSingle();
  if (error) throw new Error(`Error al cargar el nivel: ${error.message}`);
  return !!data;
}

/**
 * Registra un nivel completado por primera vez y suma las pistas de premio.
 * Devuelve el saldo nuevo. (El service ya verificó que no estuviera completado.)
 */
export async function guardarNivelCompletado(
  residenteId: string,
  organizacionId: string,
  nivel: number,
  pistasUsadas: number,
  premio: number,
): Promise<number> {
  logger.info('repo:call', { repository: 'palabrasRepository', action: 'guardarNivelCompletado', residenteId, nivel, pistasUsadas, premio });
  try {
    const { error } = await getSupabaseAdmin()
      .from('palabras_niveles_progreso')
      .upsert(
        { residente_id: residenteId, organizacion_id: organizacionId, nivel, pistas_usadas: pistasUsadas },
        { onConflict: 'residente_id,nivel', ignoreDuplicates: true },
      );
    if (error) throw new Error(`Error al guardar el nivel: ${error.message}`);
    const nuevoSaldo = (await leerPistas(residenteId)) + premio;
    await guardarPistas(residenteId, organizacionId, nuevoSaldo);
    return nuevoSaldo;
  } catch (err) {
    logger.error('repo:error', { repository: 'palabrasRepository', action: 'guardarNivelCompletado', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Gasta una pista. Devuelve el saldo nuevo, o null si no quedaban. */
export async function gastarPista(residenteId: string, organizacionId: string): Promise<number | null> {
  logger.info('repo:call', { repository: 'palabrasRepository', action: 'gastarPista', residenteId });
  try {
    const actual = await leerPistas(residenteId);
    if (actual <= 0) return null;
    await guardarPistas(residenteId, organizacionId, actual - 1);
    return actual - 1;
  } catch (err) {
    logger.error('repo:error', { repository: 'palabrasRepository', action: 'gastarPista', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
