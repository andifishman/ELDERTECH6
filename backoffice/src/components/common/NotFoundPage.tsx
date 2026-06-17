// ========================================
// COMPONENTE: NotFoundPage
// DESCRIPCIÓN: Pantalla 404 dentro del shell.
// ========================================
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      icono={Compass}
      titulo="Página no encontrada"
      descripcion="La sección que buscás no existe o fue movida."
      accion={
        <Button asChild>
          <Link to="/">Volver al dashboard</Link>
        </Button>
      }
    />
  );
}
