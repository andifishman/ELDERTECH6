// ========================================
// COMPONENTE: ProtectedRoute
// DESCRIPCIÓN:
// Protege las rutas del backoffice. Si no hay sesión,
// redirige al login. Mientras se resuelve la sesión,
// muestra un loader para evitar parpadeos.
// ========================================
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LoadingState } from '@/components/common/states';

export function ProtectedRoute() {
  const { session, cargando } = useAuth();
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

  return <Outlet />;
}
