// ========================================
// HOOK: usePermisos
// DESCRIPCIÓN:
// Deriva los permisos de la UI a partir del rol del
// administrador autenticado. Centraliza la matriz de
// permisos para que pantallas y botones la consulten.
//
//   super_admin → todo
//   admin       → CRUD de contenido + usuarios (no config global)
//   editor      → crear/editar contenido (sin eliminar ni usuarios)
// ========================================
import { useAuth } from '@/features/auth/AuthContext';
import type { Permisos, RolBackoffice } from '@/types/backoffice.types';

const MATRIZ: Record<RolBackoffice, Permisos> = {
  super_admin: {
    puedeCrear: true,
    puedeEditar: true,
    puedeEliminar: true,
    puedeGestionarUsuarios: true,
    puedeConfigurar: true,
    puedeGestionarAdmins: true,
  },
  admin: {
    puedeCrear: true,
    puedeEditar: true,
    puedeEliminar: true,
    puedeGestionarUsuarios: true,
    puedeConfigurar: false,
    puedeGestionarAdmins: false,
  },
  editor: {
    puedeCrear: true,
    puedeEditar: true,
    puedeEliminar: true,
    puedeGestionarUsuarios: false,
    puedeConfigurar: false,
    puedeGestionarAdmins: false,
  },
};

export function usePermisos(): Permisos {
  const { rol } = useAuth();
  return MATRIZ[rol] ?? MATRIZ.editor;
}
