// ========================================
// HOOK: usePermisos
// DESCRIPCIÓN:
// Qué puede hacer el usuario logueado dentro de UN módulo del
// backoffice (ver / crear / editar / eliminar). Los permisos los
// asigna el Super Super Admin desde Accesos y los resuelve el backend;
// esto solo decide qué botones mostrar. El servidor vuelve a verificar
// cada acción, así que ocultar un botón NO es la protección real.
//
//   const permisos = usePermisos('tutoriales');
//   permisos.puedeEliminar && <BotonEliminar />
// ========================================
import { useAuth } from '@/features/auth/AuthContext';
import type { ModuloId, Permisos } from '@/types/backoffice.types';

export function usePermisos(modulo: ModuloId): Permisos {
  const { puede } = useAuth();
  return {
    puedeVer: puede(modulo, 'ver'),
    puedeCrear: puede(modulo, 'crear'),
    puedeEditar: puede(modulo, 'editar'),
    puedeEliminar: puede(modulo, 'eliminar'),
  };
}
