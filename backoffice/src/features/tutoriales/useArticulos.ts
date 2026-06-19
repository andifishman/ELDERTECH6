import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  actualizarArticulo,
  crearArticulo,
  eliminarArticulo,
  eliminarDefinitivamente,
  listarArticulos,
  listarCategoriasArticulo,
  listarEliminados,
  listarPasos,
  obtenerArticulo,
  restaurarArticulo,
  type TutorialInput,
} from '@/services/articulosService';
import { notify } from '@/components/ui/toast';

export function useArticulos() {
  return useQuery({ queryKey: queryKeys.tutoriales, queryFn: listarArticulos });
}

export function useCategoriasArticulo() {
  return useQuery({
    queryKey: ['categorias-tutorial'],
    queryFn: listarCategoriasArticulo,
    staleTime: 1000 * 60 * 10,
  });
}

export function useArticulo(id?: string) {
  return useQuery({
    queryKey: ['tutorial', id],
    queryFn: () => obtenerArticulo(id!),
    enabled: !!id,
  });
}

export function usePasosTutorial(tutorialId?: string) {
  return useQuery({
    queryKey: ['pasos-tutorial', tutorialId],
    queryFn: () => listarPasos(tutorialId!),
    enabled: !!tutorialId,
  });
}

const QUERY_PAPELERA = ['tutoriales-eliminados'];

export function useArticulosEliminados() {
  return useQuery({ queryKey: QUERY_PAPELERA, queryFn: listarEliminados });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.tutoriales });
    void qc.invalidateQueries({ queryKey: QUERY_PAPELERA });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useGuardarArticulo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TutorialInput }) =>
      id ? actualizarArticulo(id, input).then(() => id) : crearArticulo(input),
    onSuccess: () => {
      notify.success('Tutorial guardado');
      invalidar();
    },
    onError: (err: any) => notify.error('No se pudo guardar el tutorial', err?.message),
  });
}

export function useEliminarArticulo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, titulo }: { id: string; titulo?: string }) => eliminarArticulo(id, titulo),
    onSuccess: () => {
      notify.success('Tutorial movido a la papelera');
      invalidar();
    },
    onError: () => notify.error('No se pudo eliminar'),
  });
}

export function useRestaurarArticulo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, titulo }: { id: string; titulo?: string }) => restaurarArticulo(id, titulo),
    onSuccess: () => {
      notify.success('Tutorial restaurado');
      invalidar();
    },
    onError: () => notify.error('No se pudo restaurar'),
  });
}

export function useEliminarDefinitivamente() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, titulo }: { id: string; titulo?: string }) => eliminarDefinitivamente(id, titulo),
    onSuccess: () => {
      notify.success('Tutorial eliminado definitivamente');
      invalidar();
    },
    onError: () => notify.error('No se pudo eliminar'),
  });
}
