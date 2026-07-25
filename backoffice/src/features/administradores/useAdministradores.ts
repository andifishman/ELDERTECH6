// ========================================
// HOOK: useAdministradores
// DESCRIPCIÓN:
// Carga todos los perfiles de usuario y permite cambiar
// el rol de un usuario entre 'residente' y 'admin'.
// Solo accesible para cuentas super_admin.
// ========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { notify } from '@/components/ui/toast';

export type RolUsuarioDB = 'residente' | 'admin' | 'staff';

export interface PerfilAdmin {
  id: string;
  username: string;
  rol: RolUsuarioDB;
  activo: boolean;
  created_at: string;
}

// IDs de las cuentas protegidas — no se puede modificar su rol desde la UI.
// El chequeo real (server-side) vive en AdministradoresService del backend;
// esto es solo para no mostrar la opción en la UI antes de intentarlo.
const SUPER_ADMIN_IDS = [
  'b035a808-2a4b-4296-9a69-76ac491b1367', // andresfishman@gmail.com
  '9cb4b7a5-759b-432d-a805-bd4722954c88', // eldertech6@gmail.com
];

export function useAdministradores() {
  return useQuery({
    queryKey: ['administradores'],
    queryFn: () => apiClient.get<PerfilAdmin[]>('/api/admin/administradores'),
  });
}

export function useCambiarRol() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, rol }: { id: string; rol: RolUsuarioDB }) => {
      if (SUPER_ADMIN_IDS.includes(id)) {
        throw new Error('No se puede modificar el rol de una cuenta super admin.');
      }
      await apiClient.patch<void>(`/api/admin/administradores/${id}/role`, { rol });
    },
    onSuccess: (_data, vars) => {
      const esAdmin = vars.rol === 'admin' || vars.rol === 'staff';
      notify.success(
        esAdmin ? 'Administrador agregado' : 'Acceso revocado',
        esAdmin
          ? 'El usuario ahora puede acceder al backoffice.'
          : 'El usuario ya no tiene acceso al backoffice.',
      );
      void qc.invalidateQueries({ queryKey: ['administradores'] });
    },
    onError: (err: Error) => {
      notify.error('Error al cambiar el rol', err.message);
    },
  });
}

export { SUPER_ADMIN_IDS };
