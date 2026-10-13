// ========================================
// COMPONENTE: DonutChartCard
// DESCRIPCIÓN:
// Gráfico de dona para distribución por categoría con
// leyenda. Paleta accesible derivada de la marca.
// ========================================
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/states';
import { PieChart as PieIcon } from 'lucide-react';

const PALETA = ['#1B5E3B', '#2E7D32', '#43A047', '#66BB6A', '#0D47A1', '#6A1B9A', '#E65100', '#FF8F00'];

/**
 * Paleta suave: tonos apagados (salvia, azul pizarra, arena, lavanda…) que se
 * distinguen entre sí sin ser llamativos. Ordenados alternando el tono para
 * que dos porciones vecinas nunca se parezcan. Se lee bien en tema claro y oscuro.
 */
export const PALETA_SUAVE = [
  '#5B8A72', // salvia
  '#6B8BAE', // azul pizarra
  '#C9A66B', // arena
  '#9C89B8', // lavanda
  '#D08C7A', // coral apagado
  '#6FA8A0', // verde agua
  '#B5838D', // malva
  '#A3B18A', // oliva claro
  '#7D9CB8', // acero
  '#D4B483', // trigo
  '#8E9AAF', // gris azulado
  '#C7A0B5', // rosa viejo
];

interface DonutChartCardProps {
  titulo: string;
  data: { label: string; valor: number }[];
  isLoading?: boolean;
  /** Colores de las porciones, en orden. Por defecto la paleta de la marca. */
  paleta?: string[];
}

export function DonutChartCard({ titulo, data, isLoading, paleta = PALETA }: DonutChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState />
        ) : data.length === 0 ? (
          <EmptyState icono={PieIcon} titulo="Sin datos aún" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="valor" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={0} stroke="none">
                {data.map((_, i) => (
                  <Cell key={i} fill={paleta[i % paleta.length]} stroke="none" />
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
