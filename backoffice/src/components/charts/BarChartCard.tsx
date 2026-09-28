// ========================================
// COMPONENTE: BarChartCard
// DESCRIPCIÓN:
// Tarjeta con gráfico de barras (Recharts). Se usa para
// "tutoriales más vistos" y "actividades por categoría".
// ========================================
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/states';
import { BarChart3, ArrowRight } from 'lucide-react';

interface BarChartCardProps {
  titulo: string;
  data: { label: string; valor: number }[];
  color?: string;
  isLoading?: boolean;
  /** Si se pasa, toda la tarjeta se vuelve clickeable y navega a esta ruta (ej: ver el ranking completo).
   * Usa onClick (no un <Link> superpuesto) para no tapar los hovers del gráfico con un overlay invisible. */
  enlace?: string;
}

export function BarChartCard({ titulo, data, color = '#1B5E3B', isLoading, enlace }: BarChartCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className={enlace ? 'group cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md' : undefined}
      onClick={enlace ? () => navigate(enlace) : undefined}
      role={enlace ? 'button' : undefined}
      tabIndex={enlace ? 0 : undefined}
      onKeyDown={enlace ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(enlace); } } : undefined}
    >
      <CardHeader className={enlace ? 'flex-row items-center justify-between space-y-0' : undefined}>
        <CardTitle className="text-base">{titulo}</CardTitle>
        {enlace && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-600 opacity-70 transition-opacity group-hover:opacity-100">
            Ver todos <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState />
        ) : data.length === 0 ? (
          <EmptyState icono={BarChart3} titulo="Sin datos aún" descripcion="Se mostrará al haber actividad." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={data.length > 5 ? -20 : 0}
                textAnchor={data.length > 5 ? 'end' : 'middle'}
                height={data.length > 5 ? 50 : 24}
              />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--accent))' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid hsl(var(--border))',
                  fontSize: 13,
                }}
              />
              <Bar dataKey="valor" fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
