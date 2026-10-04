// ========================================
// HOOK: useAccesos
// DESCRIPCIÓN:
// Módulos protegibles y permisos por usuario (Accesos). Solo para el
// Super Super Admin: el backend rechaza a cualquier otro con 403.
// ========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { notify } from '@/components/ui/toast';
import type { ModuloInfo, PermisoModulo, UsuarioConAccesos } from '@/types/backoffice.types';

export function useModulos() {
  return useQuery({
    queryKey: ['accesos', 'modulos'],
    queryFn: () => apiClient.get<ModuloInfo[]>('/api/admin/accesos/modulos'),
    staleTime: 1000 * 60 * 10,
  });
}

export function useUsuariosConAccesos() {
  return useQuery({
    queryKey: ['accesos', 'usuarios'],
    queryFn: () => apiClient.get<UsuarioConAccesos[]>('/api/admin/accesos/usuarios'),
  });
}

export function useGuardarPermisos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ usuarioId, permisos }: { usuarioId: string; permisos: PermisoModulo[] }) =>
      apiClient.put<PermisoModulo[]>(`/api/admin/accesos/usuarios/${usuarioId}`, { permisos }),
    onSuccess: () => {
      notify.success('Accesos guardados', 'Los cambios rigen desde ahora, sin que el usuario tenga que volver a entrar.');
      void qc.invalidateQueries({ queryKey: ['accesos', 'usuarios'] });
    },
    onError: (err: Error) => notify.error('No se pudieron guardar los accesos', err.message),
  });
}
