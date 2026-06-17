// ========================================
// HOOK: useFaqs + estadísticas del asistente
// ========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  actualizarFaq,
  crearFaq,
  eliminarFaq,
  listarFaqs,
  obtenerStatsAsistente,
  obtenerHistorialMensajes,
  reordenarFaq,
  type FaqInput,
} from '@/services/faqService';
import { notify } from '@/components/ui/toast';

export function useFaqs() {
  return useQuery({ queryKey: queryKeys.faqs, queryFn: listarFaqs });
}

export function useAsistenteStats() {
  return useQuery({ queryKey: queryKeys.asistenteStats, queryFn: obtenerStatsAsistente });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: queryKeys.faqs });
}

export function useGuardarFaq() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: FaqInput }) =>
      id ? actualizarFaq(id, input).then(() => id) : crearFaq(input),
    onSuccess: () => {
      notify.success('FAQ guardada');
      invalidar();
    },
    onError: () => notify.error('No se pudo guardar la FAQ'),
  });
}

export function useHistorialMensajes() {
  return useQuery({ queryKey: ['historial-mensajes'], queryFn: () => obtenerHistorialMensajes(50), staleTime: 30000 });
}

export function useReordenarFaq() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (faqs: { id: string; orden: number }[]) => reordenarFaq(faqs),
    onSuccess: () => invalidar(),
  });
}

export function useEliminarFaq() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, pregunta }: { id: string; pregunta?: string }) => eliminarFaq(id, pregunta),
    onSuccess: () => {
      notify.success('FAQ eliminada');
      invalidar();
    },
    onError: () => notify.error('No se pudo eliminar la FAQ'),
  });
}
