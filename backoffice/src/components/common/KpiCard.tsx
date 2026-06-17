// ========================================
// COMPONENTE: KpiCard
// DESCRIPCIÓN:
// Tarjeta de métrica del dashboard: ícono con color de
// acento, valor grande, etiqueta y delta opcional.
// ========================================
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Acento = 'green' | 'red' | 'purple' | 'blue' | 'amber';

const ACENTOS: Record<Acento, { barra: string; chip: string }> = {
  green: { barra: 'bg-primary', chip: 'bg-primary-100 text-primary-700' },
  red: { barra: 'bg-brand-red', chip: 'bg-red-100 text-red-700' },
  purple: { barra: 'bg-brand-purple', chip: 'bg-purple-100 text-purple-700' },
  blue: { barra: 'bg-brand-blue', chip: 'bg-blue-100 text-blue-700' },
  amber: { barra: 'bg-brand-amber', chip: 'bg-amber-100 text-amber-800' },
};

interface KpiCardProps {
  etiqueta: string;
  valor: React.ReactNode;
  icono: LucideIcon;
  acento?: Acento;
  delta?: string;
  cargando?: boolean;
}

export function KpiCard({ etiqueta, valor, icono: Icon, acento = 'green', delta, cargando }: KpiCardProps) {
  const c = ACENTOS[acento];
  return (
    <Card className="relative overflow-hidden p-5">
      <span className={cn('absolute inset-x-0 top-0 h-1', c.barra)} />
      <div className="flex items-start justify-between">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', c.chip)}>
          <Icon className="h-6 w-6" />
        </div>
        {delta && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-extrabold tracking-tight text-foreground">
          {cargando ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" /> : valor}
        </p>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{etiqueta}</p>
      </div>
    </Card>
  );
}
