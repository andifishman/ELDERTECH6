// ========================================
// PANTALLA: DashboardPage
// DESCRIPCIÓN:
// Pantalla principal del backoffice. Muestra los KPIs
// generales, gráficos de uso, las actividades del día y
// los residentes recientes. Todos los datos provienen de
// Supabase en tiempo real.
// ========================================
import { Link } from 'react-router-dom';
import { Users, CalendarDays, GraduationCap, MessageSquare, Plus, FileText, HelpCircle, Clock, Activity, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { KpiCard } from '@/components/common/KpiCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { DonutChartCard } from '@/components/charts/DonutChartCard';
import { LoadingState } from '@/components/common/states';
import { formatHora, iniciales } from '@/lib/utils';
import { useRealtime } from '@/hooks/useRealtime';
import { queryKeys } from '@/lib/queryClient';
import {
  useActividadReciente,
  useActividadesHoy,
  useActividadesPorCategoria,
  useDashboardKpis,
  useResidentesRecientes,
  useTutorialesMasVistos,
} from './useDashboard';

export function DashboardPage() {
  const kpis = useDashboardKpis();
  const actividadesHoy = useActividadesHoy();
  const residentes = useResidentesRecientes();
  const tutorialesVistos = useTutorialesMasVistos();
  const porCategoria = useActividadesPorCategoria();
  const reciente = useActividadReciente();

  // tiempo real: cambios en actividades/residentes refrescan el dashboard
  useRealtime('actividades', [queryKeys.dashboard]);
  useRealtime('residentes', [queryKeys.dashboard]);

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
          <Link to="/horarios/nueva">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-brand-red"><Plus className="h-5 w-5" /></span>
            <span className="text-sm font-semibold">Nueva actividad</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
          <Link to="/tutoriales/nuevo">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-brand-purple"><FileText className="h-5 w-5" /></span>
            <span className="text-sm font-semibold">Nuevo tutorial</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
          <Link to="/asistente">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700"><HelpCircle className="h-5 w-5" /></span>
            <span className="text-sm font-semibold">Nueva FAQ</span>
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard etiqueta="Residentes activos" valor={kpis.data?.residentesActivos ?? 0} icono={Users} acento="green" cargando={kpis.isLoading} />
        <KpiCard etiqueta="Actividades hoy" valor={kpis.data?.actividadesHoy ?? 0} icono={CalendarDays} acento="red" cargando={kpis.isLoading} />
        <KpiCard etiqueta="Tutoriales publicados" valor={kpis.data?.tutorialesPublicados ?? 0} icono={GraduationCap} acento="purple" cargando={kpis.isLoading} />
        <KpiCard etiqueta="Consultas hoy" valor={kpis.data?.consultasAsistente ?? 0} icono={MessageSquare} acento="blue" cargando={kpis.isLoading} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartCard
          titulo="Tutoriales más vistos"
          data={(tutorialesVistos.data ?? []).map((t) => ({ label: t.titulo, valor: t.vistas }))}
        />
        <DonutChartCard
          titulo="Actividades por categoría"
          data={(porCategoria.data ?? []).map((c) => ({ label: c.nombre, valor: c.total }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Actividades de hoy */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Actividades de hoy</CardTitle>
              <p className="text-xs capitalize text-muted-foreground">{fechaHoy}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/horarios">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {actividadesHoy.isLoading ? (
              <LoadingState />
            ) : (actividadesHoy.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay actividades programadas para hoy.</p>
            ) : (
              <ul className="divide-y divide-border">
                {(actividadesHoy.data ?? []).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <span className="w-14 shrink-0 text-sm font-semibold text-primary-700">{formatHora(a.hora_inicio)}</span>
                    <span className="text-xl">{a.emoji_icono ?? a.tipo_actividad?.emoji ?? '📌'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.ubicacion?.nombre ?? 'Sin lugar'}
                        {a.responsable ? ` · ${a.responsable.nombre} ${a.responsable.apellido}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Residentes recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Residentes recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {residentes.isLoading ? (
              <LoadingState />
            ) : (residentes.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin residentes registrados.</p>
            ) : (
              <ul className="space-y-1">
                {(residentes.data ?? []).map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/usuarios/${r.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                    >
                      <Avatar className="h-9 w-9">
                        {r.foto_url && <AvatarImage src={r.foto_url} alt="" />}
                        <AvatarFallback>{iniciales(`${r.nombre} ${r.apellido}`)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.nombre} {r.apellido}</p>
                        <p className="text-xs text-muted-foreground">Hab. {r.habitacion ?? '—'}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          {r.ultima_conexion
                            ? <><Wifi className="h-3 w-3 shrink-0 text-primary-500" />{formatDistanceToNow(new Date(r.ultima_conexion), { addSuffix: true, locale: es })}</>
                            : <><WifiOff className="h-3 w-3 shrink-0" />Sin actividad registrada</>
                          }
                        </p>
                      </div>
                      <Badge variant={r.activo ? 'success' : 'muted'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actividad reciente del backoffice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" /> Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(reciente.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay acciones registradas.</p>
          ) : (
            <ul className="space-y-3">
              {(reciente.data ?? []).map((log) => (
                <li key={log.id} className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground">{log.descripcion ?? `${log.accion} en ${log.tabla_afectada}`}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {kpis.data?.tutorialMasVisto && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Tutorial más visto:{' '}
          <span className="font-medium text-foreground">{kpis.data.tutorialMasVisto.titulo}</span> ({kpis.data.tutorialMasVisto.vistas} vistas)
        </p>
      )}
    </div>
  );
}
