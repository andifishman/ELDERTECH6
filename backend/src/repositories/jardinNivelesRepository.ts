import { getSupabaseAdmin } from './supabaseAdmin';
import { withRepoLogging } from '../logging/repoLogger';

export interface ProgresoNivel {
  nivel: number;
  estrellas: number;
  movimientosUsados: number;
}

/** Progreso de todos los niveles ya completados por un residente. */
export const obtenerProgreso = withRepoLogging('jardinNivelesRepository', 'obtenerProgreso', async (residenteId: string): Promise<ProgresoNivel[]> => {
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
});

/** Progreso puntual de un nivel (para el chequeo de desbloqueo y "quedate con el mejor intento"). */
export const obtenerProgresoNivel = withRepoLogging('jardinNivelesRepository', 'obtenerProgresoNivel', async (residenteId: string, nivel: number): Promise<ProgresoNivel | null> => {
    const { data, error } = await getSupabaseAdmin()
      .from('jardin_niveles_progreso')
      .select('nivel, estrellas, movimientos_usados')
      .eq('residente_id', residenteId)
      .eq('nivel', nivel)
      .maybeSingle();
    if (error) throw new Error(`Error al cargar el progreso del nivel: ${error.message}`);
    if (!data) return null;
    return { nivel: data.nivel as number, estrellas: data.estrellas as number, movimientosUsados: data.movimientos_usados as number };
});

/** Inserta o mejora el progreso de un nivel (llamado ya con el mejor valor decidido por el service). */
export const guardarProgresoNivel = withRepoLogging('jardinNivelesRepository', 'guardarProgresoNivel', async (
  residenteId: string,
  organizacionId: string,
  nivel: number,
  estrellas: number,
  movimientosUsados: number,
): Promise<void> => {
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
});
