// ========================================
// HOOK: useResidentes + mutaciones
// ========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  actualizarResidente,
  crearUsuario,
  listarResidentes,
  obtenerResidenteDetalle,
  resetearPassword,
  setActivoResidente,
  type CrearUsuarioInput,
  type ResidenteInput,
} from '@/services/residentesService';
import { notify } from '@/components/ui/toast';

export function useResidentes() {
  return useQuery({ queryKey: queryKeys.residentes, queryFn: listarResidentes });
}

export function useResidenteDetalle(id?: string) {
  return useQuery({
    queryKey: ['residente-detalle', id],
    queryFn: () => obtenerResidenteDetalle(id!),
    enabled: !!id,
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.residentes });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useCrearUsuario() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (input: CrearUsuarioInput) => crearUsuario(input),
    onSuccess: (data) => {
      notify.success('Usuario creado', `Usuario: ${data.username}`);
      invalidar();
    },
    onError: (err: Error) => notify.error('No se pudo crear el usuario', err.message),
  });
}

export function useActualizarResidente() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResidenteInput }) => actualizarResidente(id, input),
    onSuccess: () => {
      notify.success('Usuario guardado');
      invalidar();
    },
    onError: () => notify.error('No se pudo guardar el usuario'),
  });
}

export function useResetearPassword() {
  return useMutation({
    mutationFn: ({ id, dni }: { id: string; dni: string }) => resetearPassword(id, dni),
    onSuccess: () => notify.success('Contraseña actualizada'),
    onError: (err: Error) => notify.error('No se pudo actualizar la contraseña', err.message),
  });
}

export function useToggleResidente() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, activo, nombre }: { id: string; activo: boolean; nombre?: string }) =>
      setActivoResidente(id, activo, nombre),
    onSuccess: (_d, v) => {
      notify.success(v.activo ? 'Residente reactivado' : 'Residente desactivado');
      invalidar();
    },
    onError: () => notify.error('No se pudo cambiar el estado'),
  });
}
