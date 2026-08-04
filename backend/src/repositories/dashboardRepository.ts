import { getSupabaseAdmin } from './supabaseAdmin';
import type { ActividadCompleta } from '../providers/activities/ActivityTypes';
import type { AuditLog } from './auditRepository';
import type { Residente } from './residentsRepository';
import { logger } from '../logging/logger';

const ACTIVIDAD_SELECT_SIMPLE = '*, tipo_actividad:tipos_actividad(*), ubicacion:ubicaciones(*), responsable:responsables(*)';

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function contarResidentesSinAdmins(organizacionId: string): Promise<number> {
  try {
    const { data: adminLinks } = await getSupabaseAdmin().from('perfiles_usuario').select('residente_id').in('rol', ['admin', 'staff']).not('residente_id', 'is', null);
    const adminResidenteIds = ((adminLinks ?? []) as { residente_id: string }[]).map((p) => p.residente_id);

    let query = getSupabaseAdmin().from('residentes').select('*', { count: 'exact', head: true }).eq('organizacion_id', organizacionId).eq('activo', true);
    if (adminResidenteIds.length > 0) {
      query = query.not('id', 'in', `(${adminResidenteIds.join(',')})`);
    }
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export interface DashboardKpis {
  residentesActivos: number;
  actividadesHoy: number;
  tutorialesPublicados: number;
  consultasAsistente: number;
  usuariosRegistrados: number;
  tutorialMasVisto: { titulo: string; vistas: number } | null;
}

export async function obtenerKpis(organizacionId: string): Promise<DashboardKpis> {
  logger.info('repo:call', { repository: 'dashboardRepository', action: 'obtenerKpis', organizacionId });
  try {
  const hoy = hoyISO();
  const hoyStart = `${hoy}T00:00:00.000Z`;
  const hoyEnd = `${hoy}T23:59:59.999Z`;

  const [residentesActivos, actividadesHoyR, tutorialesR, consultasR] = await Promise.all([
    contarResidentesSinAdmins(organizacionId),
    getSupabaseAdmin().from('actividades').select('*', { count: 'exact', head: true }).eq('organizacion_id', organizacionId).eq('fecha', hoy).eq('activo', true),
    getSupabaseAdmin().from('tutoriales').select('*', { count: 'exact', head: true }).eq('activo', true),
    getSupabaseAdmin().from('mensajes_asistente').select('*', { count: 'exact', head: true }).eq('rol', 'usuario').gte('created_at', hoyStart).lte('created_at', hoyEnd),
  ]);

  return {
    residentesActivos,
    actividadesHoy: actividadesHoyR.count ?? 0,
    tutorialesPublicados: tutorialesR.count ?? 0,
    consultasAsistente: consultasR.count ?? 0,
    usuariosRegistrados: residentesActivos,
    tutorialMasVisto: null,
  };

  } catch (err) {
    logger.error('repo:error', { repository: 'dashboardRepository', action: 'obtenerKpis', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function obtenerActividadesHoy(organizacionId: string): Promise<ActividadCompleta[]> {
  logger.info('repo:call', { repository: 'dashboardRepository', action: 'obtenerActividadesHoy', organizacionId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('actividades')
    .select(ACTIVIDAD_SELECT_SIMPLE)
    .eq('organizacion_id', organizacionId)
    .eq('fecha', hoyISO())
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });
  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);
  return (data ?? []) as unknown as ActividadCompleta[];

  } catch (err) {
    logger.error('repo:error', { repository: 'dashboardRepository', action: 'obtenerActividadesHoy', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export type ResidenteConConexion = Residente;

export async function obtenerResidentesRecientes(organizacionId: string, limite = 5): Promise<ResidenteConConexion[]> {
  logger.info('repo:call', { repository: 'dashboardRepository', action: 'obtenerResidentesRecientes', organizacionId, limite });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('residentes')
    .select('*')
    .eq('organizacion_id', organizacionId)
    .order('activo', { ascending: false })
    .order('ultima_conexion', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Error al cargar residentes: ${error.message}`);
  return (data ?? []) as ResidenteConConexion[];

  } catch (err) {
    logger.error('repo:error', { repository: 'dashboardRepository', action: 'obtenerResidentesRecientes', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function obtenerTutorialesMasVistos(limite = 6): Promise<{ titulo: string; vistas: number }[]> {
  logger.info('repo:call', { repository: 'dashboardRepository', action: 'obtenerTutorialesMasVistos', limite });
  try {
  try {
    const { data: progreso } = await getSupabaseAdmin().from('progreso_tutorial').select('tutorial_id');
    if (!progreso || progreso.length === 0) return [];

    const conteo = new Map<string, number>();
    for (const row of progreso as Array<{ tutorial_id: string | null }>) {
      if (row.tutorial_id) conteo.set(row.tutorial_id, (conteo.get(row.tutorial_id) ?? 0) + 1);
    }

    const topIds = Array.from(conteo.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite)
      .map(([id]) => id);
    if (topIds.length === 0) return [];

    const { data: tutoriales } = await getSupabaseAdmin().from('tutoriales').select('id, titulo').in('id', topIds);
    return ((tutoriales ?? []) as Array<{ id: string; titulo: string }>)
      .map((t) => ({ titulo: t.titulo, vistas: conteo.get(t.id) ?? 0 }))
      .sort((a, b) => b.vistas - a.vistas);
  } catch {
    return [];
  }

  } catch (err) {
    logger.error('repo:error', { repository: 'dashboardRepository', action: 'obtenerTutorialesMasVistos', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function obtenerActividadReciente(organizacionId: string, limite = 6): Promise<AuditLog[]> {
  logger.info('repo:call', { repository: 'dashboardRepository', action: 'obtenerActividadReciente', organizacionId, limite });
  try {
  try {
    const { data } = await getSupabaseAdmin()
      .from('audit_logs')
      .select('*')
      .or(`organizacion_id.is.null,organizacion_id.eq.${organizacionId}`)
      .order('created_at', { ascending: false })
      .limit(limite);
    return (data ?? []) as AuditLog[];
  } catch {
    return [];
  }

  } catch (err) {
    logger.error('repo:error', { repository: 'dashboardRepository', action: 'obtenerActividadReciente', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function obtenerActividadesPorCategoria(organizacionId: string): Promise<{ nombre: string; total: number }[]> {
  logger.info('repo:call', { repository: 'dashboardRepository', action: 'obtenerActividadesPorCategoria', organizacionId });
  try {
  try {
    const { data } = await getSupabaseAdmin()
      .from('actividades')
      .select('tipo_actividad:tipos_actividad(nombre)')
      .eq('organizacion_id', organizacionId)
      .eq('activo', true);

    const conteo = new Map<string, number>();
    (data as unknown as Array<{ tipo_actividad?: { nombre?: string } | { nombre?: string }[] | null }> | null ?? []).forEach((row) => {
      const tipo = Array.isArray(row.tipo_actividad) ? row.tipo_actividad[0] : row.tipo_actividad;
      const nombre = tipo?.nombre ?? 'Otros';
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
    });
    return Array.from(conteo.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  } catch {
    return [];
  }

  } catch (err) {
    logger.error('repo:error', { repository: 'dashboardRepository', action: 'obtenerActividadesPorCategoria', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
