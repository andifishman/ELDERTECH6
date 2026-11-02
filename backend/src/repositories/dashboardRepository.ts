import { getSupabaseAdmin } from './supabaseAdmin';
import type { ActividadCompleta } from '../providers/activities/ActivityTypes';
import type { AuditLog } from './auditRepository';
import type { Residente } from './residentsRepository';
import { withRepoLogging } from '../logging/repoLogger';

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

export const obtenerKpis = withRepoLogging('dashboardRepository', 'obtenerKpis', async (organizacionId: string): Promise<DashboardKpis> => {
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
});

export const obtenerActividadesHoy = withRepoLogging('dashboardRepository', 'obtenerActividadesHoy', async (organizacionId: string): Promise<ActividadCompleta[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('actividades')
    .select(ACTIVIDAD_SELECT_SIMPLE)
    .eq('organizacion_id', organizacionId)
    .eq('fecha', hoyISO())
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });
  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);
  return (data ?? []) as unknown as ActividadCompleta[];
});

export type ResidenteConConexion = Residente;

export const obtenerResidentesRecientes = withRepoLogging('dashboardRepository', 'obtenerResidentesRecientes', async (organizacionId: string, limite: number = 5): Promise<ResidenteConConexion[]> => {
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
});

export interface TutorialConVistas {
  id: string;
  titulo: string;
  formato: string;
  activo: boolean;
  categoria: string | null;
  vistas: number;
}

/** Todos los tutoriales (publicados y borradores) con su cantidad de vistas, ordenados de más a menos —
 * incluye los que todavía no tienen ninguna vista (vistas: 0), a diferencia de antes que solo traía los
 * que ya habían sido vistos. Sin `limite`, devuelve el listado completo (lo usa la pantalla "Tutoriales vistos"). */
export const obtenerTutorialesMasVistos = withRepoLogging('dashboardRepository', 'obtenerTutorialesMasVistos', async (limite?: number): Promise<TutorialConVistas[]> => {
    const [{ data: progreso }, { data: tutoriales }] = await Promise.all([
      getSupabaseAdmin().from('progreso_tutorial').select('tutorial_id'),
      getSupabaseAdmin().from('tutoriales').select('id, titulo, formato, activo, categoria:categorias_tutorial(nombre)'),
    ]);

    const conteo = new Map<string, number>();
    for (const row of (progreso ?? []) as Array<{ tutorial_id: string | null }>) {
      if (row.tutorial_id) conteo.set(row.tutorial_id, (conteo.get(row.tutorial_id) ?? 0) + 1);
    }

    const resultado = ((tutoriales ?? []) as unknown as Array<{
      id: string; titulo: string; formato: string; activo: boolean; categoria: { nombre: string } | null;
    }>)
      .map((t) => ({
        id: t.id,
        titulo: t.titulo,
        formato: t.formato,
        activo: t.activo,
        categoria: t.categoria?.nombre ?? null,
        vistas: conteo.get(t.id) ?? 0,
      }))
      .sort((a, b) => b.vistas - a.vistas);

    return typeof limite === 'number' ? resultado.slice(0, limite) : resultado;
});

export const obtenerActividadReciente = withRepoLogging('dashboardRepository', 'obtenerActividadReciente', async (organizacionId: string, limite: number = 6): Promise<AuditLog[]> => {
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
});

/**
 * Usuarios activos de la app agrupados por sección del geriátrico. Cuenta solo
 * residentes con cuenta (fila en `perfiles_usuario`) — los mismos que lista la
 * pantalla Usuarios del backoffice.
 */
export const obtenerUsuariosPorSeccion = withRepoLogging('dashboardRepository', 'obtenerUsuariosPorSeccion', async (organizacionId: string): Promise<{ nombre: string; total: number }[]> => {
    const [residentesR, perfilesR] = await Promise.all([
      getSupabaseAdmin().from('residentes').select('id, seccion').eq('organizacion_id', organizacionId).eq('activo', true),
      getSupabaseAdmin().from('perfiles_usuario').select('residente_id').eq('organizacion_id', organizacionId).not('residente_id', 'is', null),
    ]);
    if (residentesR.error) throw new Error(`Error al cargar usuarios por sección: ${residentesR.error.message}`);
    if (perfilesR.error) throw new Error(`Error al cargar usuarios por sección: ${perfilesR.error.message}`);

    const conCuenta = new Set(((perfilesR.data ?? []) as Array<{ residente_id: string }>).map((p) => p.residente_id));
    const conteo = new Map<string, number>();
    for (const r of (residentesR.data ?? []) as Array<{ id: string; seccion: string | null }>) {
      if (!conCuenta.has(r.id)) continue;
      const nombre = r.seccion ?? 'Sin sección';
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
    }
    // Orden natural de las secciones ("1 AC", "1 B", "2 AC"…), "Sin sección" al final.
    return Array.from(conteo.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => {
        if (a.nombre === 'Sin sección') return 1;
        if (b.nombre === 'Sin sección') return -1;
        return a.nombre.localeCompare(b.nombre, 'es', { numeric: true });
      });
});

export const obtenerActividadesPorCategoria = withRepoLogging('dashboardRepository', 'obtenerActividadesPorCategoria', async (organizacionId: string): Promise<{ nombre: string; total: number }[]> => {
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
});
