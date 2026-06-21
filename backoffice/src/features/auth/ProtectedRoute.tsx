// ========================================
// COMPONENTE: ProtectedRoute
// DESCRIPCIÓN:
// Protege las rutas del backoffice. Si no hay sesión,
// redirige al login. Si el usuario no tiene rol de
// backoffice (ej: es residente), muestra acceso denegado.
// ========================================
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldX, LogOut } from 'lucide-react';
import { useAuth } from './AuthContext';
import { LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';

export function ProtectedRoute() {
  const { session, cargando, autorizado, signOut } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingState mensaje="Verificando sesión…" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!autorizado) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Acceso denegado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu cuenta no tiene permisos para acceder al backoffice.
              Contactá a un administrador si creés que esto es un error.
            </p>
          </div>
          <Button variant="outline" onClick={() => void signOut()} className="gap-2">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
