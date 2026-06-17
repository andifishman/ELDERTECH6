// ========================================
// COMPONENTE: EmptyState
// DESCRIPCIÓN:
// Estado vacío reutilizable con ícono, mensaje y acción
// opcional. Se muestra cuando una lista no tiene datos.
// ========================================
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icono: LucideIcon;
  titulo: string;
  descripcion?: string;
  accion?: React.ReactNode;
}

export function EmptyState({ icono: Icon, titulo, descripcion, accion }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{titulo}</h3>
      {descripcion && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
