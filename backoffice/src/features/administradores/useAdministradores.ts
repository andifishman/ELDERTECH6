// ========================================
// HOOK: useAdministradores
// DESCRIPCIÓN:
// Carga todos los perfiles de usuario y permite cambiar
// el rol de un usuario entre 'residente' y 'admin'.
// Solo accesible para cuentas super_admin.
// ========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { notify } from '@/components/ui/toast';

export type RolUsuarioDB = 'residente' | 'admin' | 'staff';

export interface PerfilAdmin {
  id: string;
  username: string;
  rol: RolUsuarioDB;
  activo: boolean;
  created_at: string;
}

// IDs de las cuentas protegidas — no se puede modificar su rol desde la UI
const SUPER_ADMIN_IDS = [
  'b035a808-2a4b-4296-9a69-76ac491b1367', // andresfishman@gmail.com
  '9cb4b7a5-759b-432d-a805-bd4722954c88', // eldertech6@gmail.com
];

export function useAdministradores() {
  return useQuery({
    queryKey: ['administradores'],
    queryFn: async (): Promise<PerfilAdmin[]> => {
      const { data, error } = await supabase
        .from('perfiles_usuario')
        .select('id, username, rol, activo, created_at')
        .order('username', { ascending: true });

      if (error) throw error;
      return (data ?? []) as PerfilAdmin[];
    },
  });
}

export function useCambiarRol() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, rol }: { id: string; rol: RolUsuarioDB }) => {
      if (SUPER_ADMIN_IDS.includes(id)) {
        throw new Error('No se puede modificar el rol de una cuenta super admin.');
      }
      const { error } = await supabase
        .from('perfiles_usuario')
        .update({ rol })
        .eq('id', id);
      if (error) throw error;
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
