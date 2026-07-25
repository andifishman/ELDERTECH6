// ========================================
// HOOKS: Pedidos y Sugerencias
// ========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/components/ui/toast';
import { queryKeys } from '@/lib/queryClient';
import {
  actualizarEstadoPedido,
  eliminarPedido,
  listarPedidos,
  obtenerPedido,
  reintentarTranscripcion,
  type EstadoPedido,
  type ListarPedidosFiltros,
} from '@/services/pedidosService';

export function usePedidosLista(filtros: ListarPedidosFiltros) {
  return useQuery({
    queryKey: queryKeys.pedidos(filtros),
    queryFn: () => listarPedidos(filtros),
  });
}

export function usePedidoDetalle(id?: string) {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: () => obtenerPedido(id!),
    enabled: !!id,
  });
}

function useInvalidarPedidos() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['pedidos'] });
}

export function useActualizarEstadoPedido() {
  const invalidar = useInvalidarPedidos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoPedido }) => actualizarEstadoPedido(id, estado),
    onSuccess: (_data, vars) => {
      notify.success('Estado actualizado');
      invalidar();
      void qc.invalidateQueries({ queryKey: ['pedido', vars.id] });
    },
    onError: () => notify.error('No se pudo actualizar el estado'),
  });
}

export function useEliminarPedido() {
  const invalidar = useInvalidarPedidos();
  return useMutation({
    mutationFn: (id: string) => eliminarPedido(id),
    onSuccess: () => {
      notify.success('Solicitud eliminada');
      invalidar();
    },
    onError: () => notify.error('No se pudo eliminar la solicitud'),
  });
}

export function useReintentarTranscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reintentarTranscripcion(id),
    onSuccess: (data) => {
      notify.success('Transcripción actualizada');
      qc.setQueryData(['pedido', data.id], data);
    },
    onError: () => notify.error('No se pudo transcribir el audio'),
  });
}
