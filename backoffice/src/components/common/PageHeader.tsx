// ========================================
// COMPONENTE: PageHeader
// DESCRIPCIÓN:
// Encabezado de sección con título, descripción y un
// espacio a la derecha para acciones (ej: botón Agregar).
// ========================================
import * as React from 'react';

interface PageHeaderProps {
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
}

export function PageHeader({ titulo, descripcion, acciones }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  );
}
