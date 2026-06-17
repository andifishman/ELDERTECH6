// ========================================
// SERVICIO: Auditoría
// DESCRIPCIÓN:
// Registra cada acción administrativa en audit_logs
// (quién, qué, cuándo, sobre qué tabla). No bloquea la
// operación principal: si falla el log, solo se advierte
// en consola.
// ========================================
import { supabase, ORG_ID } from '@/lib/supabase';
import type { AccionAuditoria } from '@/types/backoffice.types';

interface RegistrarParams {
  accion: AccionAuditoria;
  tabla: string;
  registroId?: string | null;
  descripcion?: string;
  datosNuevos?: Record<string, unknown> | null;
  datosPrevios?: Record<string, unknown> | null;
}

export async function registrarAuditoria(params: RegistrarParams): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    await supabase.from('audit_logs').insert({
      organizacion_id: ORG_ID || null,
      usuario_id: user?.id ?? null,
      usuario_nombre: user?.email ?? null,
      accion: params.accion,
      tabla_afectada: params.tabla,
      registro_id: params.registroId ?? null,
      descripcion: params.descripcion ?? null,
      datos_nuevos: params.datosNuevos ?? null,
      datos_previos: params.datosPrevios ?? null,
    });
  } catch (err) {
    // la auditoría no debe romper la operación principal
    console.warn('[auditoría] no se pudo registrar la acción:', err);
  }
}
