import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export interface DeviceToken {
  id: string;
  perfil_usuario_id: string;
  residente_id: string | null;
  organizacion_id: string | null;
  expo_push_token: string;
  plataforma: 'ios' | 'android' | 'web';
  dispositivo: string | null;
  activo: boolean;
  last_seen_at: string;
}

export interface RegistrarTokenInput {
  perfilUsuarioId: string;
  residenteId: string | null;
  organizacionId: string | null;
  expoPushToken: string;
  plataforma: 'ios' | 'android' | 'web';
  dispositivo: string | null;
}

/** Upsert por `expo_push_token` (único) — si el residente reinstala o cambia de cuenta en el mismo aparato, se reasigna. */
export async function registrarToken(input: RegistrarTokenInput): Promise<void> {
  logger.info('repo:call', { repository: 'deviceTokensRepository', action: 'registrarToken', input });
  try {
  const { error } = await getSupabaseAdmin()
    .from('device_tokens')
    .upsert(
      {
        perfil_usuario_id: input.perfilUsuarioId,
        residente_id: input.residenteId,
        organizacion_id: input.organizacionId,
        expo_push_token: input.expoPushToken,
        plataforma: input.plataforma,
        dispositivo: input.dispositivo,
        activo: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'expo_push_token' },
    );
  if (error) throw new Error(`Error al registrar el dispositivo: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'deviceTokensRepository', action: 'registrarToken', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function desactivarToken(expoPushToken: string): Promise<void> {
  logger.info('repo:call', { repository: 'deviceTokensRepository', action: 'desactivarToken' });
  try {
  const { error } = await getSupabaseAdmin().from('device_tokens').update({ activo: false }).eq('expo_push_token', expoPushToken);
  if (error) throw new Error(`Error al desactivar el dispositivo: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'deviceTokensRepository', action: 'desactivarToken', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Tokens activos de un conjunto de residentes — usado para armar el fanout de un envío. */
export async function findTokensActivosPorResidentes(residenteIds: string[]): Promise<DeviceToken[]> {
  logger.info('repo:call', { repository: 'deviceTokensRepository', action: 'findTokensActivosPorResidentes', residenteIds });
  try {
  if (residenteIds.length === 0) return [];
  const { data, error } = await getSupabaseAdmin().from('device_tokens').select('*').in('residente_id', residenteIds).eq('activo', true);
  if (error) throw new Error(`Error al cargar dispositivos: ${error.message}`);
  return (data ?? []) as DeviceToken[];

  } catch (err) {
    logger.error('repo:error', { repository: 'deviceTokensRepository', action: 'findTokensActivosPorResidentes', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
