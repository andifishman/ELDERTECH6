// ========================================
// HOOK: useResidentes + mutaciones
// ========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  actualizarResidente,
  crearResidente,
  listarResidentes,
  setActivoResidente,
  type ResidenteInput,
} from '@/services/residentesService';
import { notify } from '@/components/ui/toast';

export function useResidentes() {
  return useQuery({ queryKey: queryKeys.residentes, queryFn: listarResidentes });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.residentes });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useGuardarResidente() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ResidenteInput }) =>
      id ? actualizarResidente(id, input).then(() => id) : crearResidente(input),
    onSuccess: () => {
      notify.success('Residente guardado');
      invalidar();
    },
    onError: () => notify.error('No se pudo guardar el residente'),
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
