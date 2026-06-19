import { supabase, ORG_ID } from '@/lib/supabase';
import type { AuditLog, DashboardKpis } from '@/types/backoffice.types';
import type { ActividadCompleta, Residente } from '@/types/database.types';

export interface ResidenteConConexion extends Residente {
  ultima_conexion: string | null;
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  const hoyStart = `${hoy}T00:00:00.000Z`;
  const hoyEnd = `${hoy}T23:59:59.999Z`;

  const [residentesActivos, actividadesHoy, tutorialesPublicados, consultasAsistente] =
    await Promise.all([
      contar('residentes', (q) => q.eq('organizacion_id', ORG_ID).eq('activo', true)),
      contar('actividades', (q) => q.eq('organizacion_id', ORG_ID).eq('fecha', hoy).eq('activo', true)),
      contar('tutoriales', (q) => q.eq('activo', true)),
      contar('mensajes_asistente', (q) =>
        q.eq('rol', 'usuario').gte('created_at', hoyStart).lte('created_at', hoyEnd),
      ),
    ]);

  return {
    residentesActivos,
    actividadesHoy,
    tutorialesPublicados,
    consultasAsistente,
    usuariosRegistrados: residentesActivos,
    tutorialMasVisto: null,
  };
}

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

export async function obtenerResidentesRecientes(limite = 5): Promise<ResidenteConConexion[]> {
  const { data, error } = await supabase
    .from('residentes')
    .select('*')
    .eq('organizacion_id', ORG_ID)
    .order('activo', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []) as ResidenteConConexion[];
}

export async function obtenerTutorialesMasVistos(limite = 6): Promise<{ titulo: string; vistas: number }[]> {
  try {
    // Cuenta cuántas veces fue visto cada tutorial desde progreso_tutorial
    const { data: progreso } = await supabase
      .from('progreso_tutorial')
      .select('tutorial_id');

    if (!progreso || progreso.length === 0) return [];

    // Conteo manual por tutorial_id
    const conteo = new Map<string, number>();
    for (const row of progreso) {
      if (row.tutorial_id) {
        conteo.set(row.tutorial_id, (conteo.get(row.tutorial_id) ?? 0) + 1);
      }
    }

    const topIds = Array.from(conteo.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite)
      .map(([id]) => id);

    if (topIds.length === 0) return [];

    const { data: tutoriales } = await supabase
      .from('tutoriales')
      .select('id, titulo')
      .in('id', topIds);

    return (tutoriales ?? []).map((t) => ({
      titulo: t.titulo,
      vistas: conteo.get(t.id) ?? 0,
    })).sort((a, b) => b.vistas - a.vistas);
  } catch {
    return [];
  }
}

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
