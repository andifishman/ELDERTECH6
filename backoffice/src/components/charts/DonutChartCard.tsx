// ========================================
// COMPONENTE: DonutChartCard
// DESCRIPCIÓN:
// Gráfico de dona para distribución por categoría con
// leyenda. Paleta accesible derivada de la marca.
// ========================================
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { PieChart as PieIcon } from 'lucide-react';

const PALETA = ['#1B5E3B', '#2E7D32', '#43A047', '#66BB6A', '#0D47A1', '#6A1B9A', '#E65100', '#FF8F00'];

interface DonutChartCardProps {
  titulo: string;
  data: { label: string; valor: number }[];
}

export function DonutChartCard({ titulo, data }: DonutChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icono={PieIcon} titulo="Sin datos aún" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="valor" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETA[i % PALETA.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
