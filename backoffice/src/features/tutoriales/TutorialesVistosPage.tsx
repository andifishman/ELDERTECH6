// ========================================
// PANTALLA: TutorialesVistosPage
// DESCRIPCIÓN:
// Ranking completo de vistas por tutorial — versión ampliada
// del gráfico "Tutoriales más vistos" del Dashboard. Se llega
// acá tocando esa tarjeta.
// ========================================
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, Eye, EyeOff, TrendingUp, FileText, PlayCircle, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/common/KpiCard';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { useRealtime } from '@/hooks/useRealtime';
import { queryKeys } from '@/lib/queryClient';
import { useTutorialesVistosCompleto } from '@/features/dashboard/useDashboard';

const COLOR_CON_VISTAS = '#1B5E3B';
const COLOR_SIN_VISTAS = '#D9E4DE';

// Podio de los primeros 3 puestos — un color distinto para cada uno, el resto queda neutro.
const RANK_STYLE = [
  'bg-amber-100 text-amber-700',
  'bg-gray-200 text-gray-700',
  'bg-orange-100 text-orange-700',
];

function truncar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

export function TutorialesVistosPage() {
  const { data, isLoading, isError, refetch } = useTutorialesVistosCompleto();
  useRealtime('tutoriales', [queryKeys.dashboard]);

  const tutoriales = data ?? [];
  const totalVistas = tutoriales.reduce((suma, t) => suma + t.vistas, 0);
  const sinVistas = tutoriales.filter((t) => t.vistas === 0).length;
  const masVisto = tutoriales[0];
  const maxVistas = masVisto?.vistas ?? 0;

  // El gráfico solo muestra el top 15 (más legible); la lista de abajo tiene el ranking completo.
  const datosGrafico = tutoriales.slice(0, 15).map((t) => ({
    label: truncar(t.titulo, 30),
    valor: t.vistas,
  }));
  const alturaGrafico = Math.max(280, datosGrafico.length * 38);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Tutoriales vistos"
        descripcion="Ranking completo de vistas por tutorial."
        acciones={
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Volver al dashboard
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState mensaje="Cargando estadísticas de tutoriales..." />
      ) : isError ? (
        <ErrorState onReintentar={() => void refetch()} />
      ) : tutoriales.length === 0 ? (
        <EmptyState icono={GraduationCap} titulo="Todavía no hay tutoriales" descripcion="Se van a mostrar acá en cuanto crees el primero." />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard etiqueta="Vistas totales" valor={totalVistas} icono={Eye} acento="blue" />
            <KpiCard
              etiqueta={masVisto ? `Más visto: ${truncar(masVisto.titulo, 40)}` : 'Más visto'}
              valor={masVisto ? masVisto.vistas : '—'}
              icono={TrendingUp}
              acento="green"
            />
            <KpiCard etiqueta="Tutoriales sin ninguna vista" valor={sinVistas} icono={EyeOff} acento="amber" />
          </div>

          {/* Gráfico grande, horizontal — se lee mejor con títulos largos que el de barras verticales del Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {tutoriales.length > 15 ? `Top 15 de ${tutoriales.length} tutoriales` : 'Vistas por tutorial'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={alturaGrafico}>
                <BarChart data={datosGrafico} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={220}
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 13 }}
                  />
                  <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {datosGrafico.map((d, i) => (
                      <Cell key={i} fill={d.valor > 0 ? COLOR_CON_VISTAS : COLOR_SIN_VISTAS} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ranking completo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking completo ({tutoriales.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {tutoriales.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-4 px-6 py-4">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        i < 3 ? RANK_STYLE[i] : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </span>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                      {t.formato === 'video' ? <PlayCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{t.titulo}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {t.categoria && <Badge variant="outline" className="text-[11px]">{t.categoria}</Badge>}
                        <Badge variant={t.activo ? 'success' : 'warning'} className="text-[11px]">
                          {t.activo ? 'Publicado' : 'Borrador'}
                        </Badge>
                      </div>
                      <div className="mt-2 h-1.5 max-w-xs rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${maxVistas > 0 ? (t.vistas / maxVistas) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xl font-extrabold tabular-nums text-foreground">{t.vistas}</p>
                      <p className="text-xs text-muted-foreground">{t.vistas === 1 ? 'vista' : 'vistas'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
