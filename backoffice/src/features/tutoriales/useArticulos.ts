// ========================================
// HOOK: useArticulos + mutaciones
// DESCRIPCIÓN:
// Queries y mutaciones del módulo Tutoriales/Artículos.
// ========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  actualizarArticulo,
  crearArticulo,
  eliminarArticulo,
  listarArticulos,
  listarCategoriasArticulo,
  obtenerArticulo,
  type ArticuloInput,
} from '@/services/articulosService';
import { notify } from '@/components/ui/toast';

export function useArticulos() {
  return useQuery({ queryKey: queryKeys.articulos, queryFn: listarArticulos });
}

export function useCategoriasArticulo() {
  return useQuery({ queryKey: ['categorias-articulo'], queryFn: listarCategoriasArticulo, staleTime: 1000 * 60 * 10 });
}

export function useArticulo(id?: string) {
  return useQuery({ queryKey: ['articulo', id], queryFn: () => obtenerArticulo(id!), enabled: !!id });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.articulos });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useGuardarArticulo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ArticuloInput }) =>
      id ? actualizarArticulo(id, input).then(() => id) : crearArticulo(input),
    onSuccess: () => {
      notify.success('Contenido guardado');
      invalidar();
    },
    onError: () => notify.error('No se pudo guardar el contenido'),
  });
}

export function useEliminarArticulo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, titulo }: { id: string; titulo?: string }) => eliminarArticulo(id, titulo),
    onSuccess: () => {
      notify.success('Contenido eliminado');
      invalidar();
    },
    onError: () => notify.error('No se pudo eliminar'),
  });
}
