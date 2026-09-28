import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export interface ProgresoNivel {
  nivel: number;
  estrellas: number;
  movimientosUsados: number;
}

/** Progreso de todos los niveles ya completados por un residente. */
export async function obtenerProgreso(residenteId: string): Promise<ProgresoNivel[]> {
  logger.info('repo:call', { repository: 'jardinNivelesRepository', action: 'obtenerProgreso', residenteId });
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('jardin_niveles_progreso')
      .select('nivel, estrellas, movimientos_usados')
      .eq('residente_id', residenteId)
      .order('nivel', { ascending: true });
    if (error) throw new Error(`Error al cargar el progreso de niveles: ${error.message}`);

    return (data ?? []).map((fila) => ({
      nivel: fila.nivel as number,
      estrellas: fila.estrellas as number,
      movimientosUsados: fila.movimientos_usados as number,
    }));
  } catch (err) {
    logger.error('repo:error', { repository: 'jardinNivelesRepository', action: 'obtenerProgreso', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Progreso puntual de un nivel (para el chequeo de desbloqueo y "quedate con el mejor intento"). */
export async function obtenerProgresoNivel(residenteId: string, nivel: number): Promise<ProgresoNivel | null> {
  logger.info('repo:call', { repository: 'jardinNivelesRepository', action: 'obtenerProgresoNivel', residenteId, nivel });
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('jardin_niveles_progreso')
      .select('nivel, estrellas, movimientos_usados')
      .eq('residente_id', residenteId)
      .eq('nivel', nivel)
      .maybeSingle();
    if (error) throw new Error(`Error al cargar el progreso del nivel: ${error.message}`);
    if (!data) return null;
    return { nivel: data.nivel as number, estrellas: data.estrellas as number, movimientosUsados: data.movimientos_usados as number };
  } catch (err) {
    logger.error('repo:error', { repository: 'jardinNivelesRepository', action: 'obtenerProgresoNivel', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Inserta o mejora el progreso de un nivel (llamado ya con el mejor valor decidido por el service). */
export async function guardarProgresoNivel(
  residenteId: string,
  organizacionId: string,
  nivel: number,
  estrellas: number,
  movimientosUsados: number,
): Promise<void> {
  logger.info('repo:call', { repository: 'jardinNivelesRepository', action: 'guardarProgresoNivel', residenteId, nivel, estrellas, movimientosUsados });
  try {
    const { error } = await getSupabaseAdmin()
      .from('jardin_niveles_progreso')
      .upsert(
        {
          residente_id: residenteId,
          organizacion_id: organizacionId,
          nivel,
          estrellas,
          movimientos_usados: movimientosUsados,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'residente_id,nivel' },
      );
    if (error) throw new Error(`Error al guardar el progreso del nivel: ${error.message}`);
  } catch (err) {
    logger.error('repo:error', { repository: 'jardinNivelesRepository', action: 'guardarProgresoNivel', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
