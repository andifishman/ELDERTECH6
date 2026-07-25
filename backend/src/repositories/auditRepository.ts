import { getSupabaseAdmin } from './supabaseAdmin';

export type AccionAuditoria = 'crear' | 'editar' | 'eliminar' | 'pausar' | 'reactivar' | 'publicar' | 'resolver';

export interface RegistrarAuditoriaInput {
  organizacionId: string | null;
  usuarioId: string | null;
  usuarioNombre: string | null;
  accion: AccionAuditoria;
  tabla: string;
  registroId?: string | null;
  descripcion?: string;
  datosNuevos?: Record<string, unknown> | null;
  datosPrevios?: Record<string, unknown> | null;
}

export async function insertAuditLog(input: RegistrarAuditoriaInput): Promise<void> {
  const { error } = await getSupabaseAdmin().from('audit_logs').insert({
    organizacion_id: input.organizacionId,
    usuario_id: input.usuarioId,
    usuario_nombre: input.usuarioNombre,
    accion: input.accion,
    tabla_afectada: input.tabla,
    registro_id: input.registroId ?? null,
    descripcion: input.descripcion ?? null,
    datos_nuevos: input.datosNuevos ?? null,
    datos_previos: input.datosPrevios ?? null,
  });
  if (error) throw new Error(`Error al registrar auditoría: ${error.message}`);
}

export interface AuditLog {
  id: string;
  organizacion_id: string | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  accion: AccionAuditoria;
  tabla_afectada: string;
  registro_id: string | null;
  descripcion: string | null;
  datos_previos: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  created_at: string;
}

/** Porteo de `backoffice/src/features/auditoria/AuditoriaPage.tsx` (listarAuditoria). */
export async function listarAuditLogs(organizacionId: string, limit = 200): Promise<AuditLog[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('audit_logs')
    .select('*')
    .or(`organizacion_id.is.null,organizacion_id.eq.${organizacionId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Error al cargar auditoría: ${error.message}`);
  return (data ?? []) as AuditLog[];
}
