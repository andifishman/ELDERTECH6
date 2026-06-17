// ========================================
// SERVICIO: Dashboard
// DESCRIPCIÓN:
// Calcula los KPIs y datasets de los gráficos del
// dashboard a partir de datos reales de Supabase. Cada
// consulta es tolerante a fallos para que un módulo
// faltante no tumbe todo el panel.
// ========================================
import { supabase, ORG_ID } from '@/lib/supabase';
import type { AuditLog, DashboardKpis } from '@/types/backoffice.types';
import type { ActividadCompleta, Residente } from '@/types/database.types';

// devuelve la fecha de hoy en formato 'YYYY-MM-DD'
function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// helper: cuenta filas de una tabla con filtros, devolviendo 0 ante error
async function contar(tabla: string, aplicar: (q: any) => any): Promise<number> {
  try {
    const base = supabase.from(tabla).select('*', { count: 'exact', head: true });
    const { count, error } = await aplicar(base);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function obtenerKpis(): Promise<DashboardKpis> {
  const hoy = hoyISO();

  const [residentesActivos, actividadesHoy, tutorialesPublicados, consultasAsistente, usuariosRegistrados] =
    await Promise.all([
      contar('residentes', (q) => q.eq('organizacion_id', ORG_ID).eq('activo', true)),
      contar('actividades', (q) => q.eq('organizacion_id', ORG_ID).eq('fecha', hoy).eq('activo', true)),
      contar('tutoriales', (q) => q.eq('activo', true)),
      contar('assistant_logs', (q) => q.eq('organizacion_id', ORG_ID)),
      contar('residentes', (q) => q.eq('organizacion_id', ORG_ID)),
    ]);

  // tutorial más visto (si la tabla de progreso/vistas existe)
  let tutorialMasVisto: DashboardKpis['tutorialMasVisto'] = null;
  try {
    const { data } = await supabase
      .from('articulos')
      .select('titulo, vistas')
      .eq('activo', true)
      .order('vistas', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) tutorialMasVisto = { titulo: data.titulo, vistas: data.vistas ?? 0 };
  } catch {
    /* opcional */
  }

  return {
    residentesActivos,
    actividadesHoy,
    tutorialesPublicados,
    consultasAsistente,
    usuariosRegistrados,
    tutorialMasVisto,
  };
}

// actividades de hoy con sus joins (para la tabla del dashboard)
export async function obtenerActividadesHoy(): Promise<ActividadCompleta[]> {
  const { data, error } = await supabase
    .from('actividades')
    .select('*, tipo_actividad:tipos_actividad(*), ubicacion:ubicaciones(*), responsable:responsables(*)')
    .eq('organizacion_id', ORG_ID)
    .eq('fecha', hoyISO())
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ActividadCompleta[];
}

// últimos residentes ingresados
export async function obtenerResidentesRecientes(limite = 5): Promise<Residente[]> {
  const { data, error } = await supabase
    .from('residentes')
    .select('*')
    .eq('organizacion_id', ORG_ID)
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []) as Residente[];
}

// dataset para el gráfico "tutoriales/artículos más vistos"
export async function obtenerTutorialesMasVistos(limite = 6): Promise<{ titulo: string; vistas: number }[]> {
  try {
    const { data } = await supabase
      .from('articulos')
      .select('titulo, vistas')
      .eq('activo', true)
      .order('vistas', { ascending: false })
      .limit(limite);
    return (data ?? []).map((d) => ({ titulo: d.titulo, vistas: d.vistas ?? 0 }));
  } catch {
    return [];
  }
}

// feed de actividad reciente del backoffice (últimas acciones auditadas)
export async function obtenerActividadReciente(limite = 6): Promise<AuditLog[]> {
  try {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .or(`organizacion_id.is.null,organizacion_id.eq.${ORG_ID}`)
      .order('created_at', { ascending: false })
      .limit(limite);
    return (data ?? []) as AuditLog[];
  } catch {
    return [];
  }
}

// dataset para el gráfico "actividades por categoría" (próximos 7 días)
export async function obtenerActividadesPorCategoria(): Promise<{ nombre: string; total: number }[]> {
  try {
    const { data } = await supabase
      .from('actividades')
      .select('tipo_actividad:tipos_actividad(nombre)')
      .eq('organizacion_id', ORG_ID)
      .eq('activo', true);

    const conteo = new Map<string, number>();
    (data ?? []).forEach((row: any) => {
      const nombre = row.tipo_actividad?.nombre ?? 'Otros';
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
    });
    return Array.from(conteo.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  } catch {
    return [];
  }
}
