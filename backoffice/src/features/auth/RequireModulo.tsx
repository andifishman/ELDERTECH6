// ========================================
// COMPONENTE: RequireModulo
// DESCRIPCIÓN:
// Protege una ruta del backoffice por módulo: si el usuario no tiene
// permiso para VER ese módulo, muestra "Acceso denegado" en vez de la
// pantalla (aunque escriba la URL a mano). Es la capa de navegación;
// la protección real de los datos la hace el backend en cada request.
// ========================================
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from './AuthContext';
import { LoadingState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { NAV_ITEMS } from '@/components/layout/nav.config';
import type { AccionModulo, ModuloId } from '@/types/backoffice.types';

export function AccesoDenegado({ modulo }: { modulo?: string }) {
  return (
    <EmptyState
      icono={ShieldX}
      titulo="No tenés acceso a esta sección"
      descripcion={`${modulo ? `Tu usuario no tiene permiso para ver "${modulo}". ` : ''}Si lo necesitás, pedile acceso a un Super Admin.`}
      accion={
        <Button asChild variant="outline">
          <Link to="/">Volver al inicio</Link>
        </Button>
      }
    />
  );
}

export function RequireModulo({ modulo, accion = 'ver', children }: { modulo: ModuloId; accion?: AccionModulo; children: ReactNode }) {
  const { puede, cargandoPermisos } = useAuth();
  if (cargandoPermisos) return <LoadingState mensaje="Verificando permisos…" />;
  if (!puede(modulo, accion)) {
    const nombre = NAV_ITEMS.find((i) => i.modulo === modulo)?.label;
    return <AccesoDenegado modulo={nombre} />;
  }
  return <>{children}</>;
}

/**
 * Pantalla de inicio (/): el Dashboard si el usuario puede verlo; si no, lo
 * manda al primer módulo que sí tiene. Si no tiene ninguno, se lo explica.
 */
export function Inicio({ children }: { children: ReactNode }) {
  const { puede, cargandoPermisos } = useAuth();
  if (cargandoPermisos) return <LoadingState mensaje="Verificando permisos…" />;
  if (puede('dashboard', 'ver')) return <>{children}</>;
  const primero = NAV_ITEMS.find((i) => i.to !== '/' && puede(i.modulo, 'ver'));
  if (primero) return <Navigate to={primero.to} replace />;
  return (
    <EmptyState
      icono={ShieldX}
      titulo="Todavía no tenés módulos asignados"
      descripcion="Tu cuenta puede entrar al backoffice pero aún no tiene acceso a ninguna sección. Pedile a un Super Admin que te asigne los accesos."
    />
  );
}
