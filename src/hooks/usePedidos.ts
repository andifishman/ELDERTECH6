// Hooks de React Query para el módulo Pedidos y Sugerencias
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { editarPedido, enviarPedido, listarPedidos, type EditarPedidoInput, type EnviarPedidoInput } from '@/services/pedidosService';

export const KEYS = {
  lista: ['pedidos'] as const,
};

export function usePedidos() {
  return useQuery({
    queryKey: KEYS.lista,
    queryFn: listarPedidos,
    staleTime: 1000 * 30,
  });
}

export function useEnviarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EnviarPedidoInput) => enviarPedido(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.lista });
    },
  });
}

export function useEditarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditarPedidoInput }) => editarPedido(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.lista });
    },
  });
}
