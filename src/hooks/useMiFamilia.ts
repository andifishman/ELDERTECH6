// Hooks de React Query para "Mi familia"
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listarConversacionesFamilia, listarMensajesFamilia, responderFamilia } from '@/services/miFamiliaService';

export const KEYS = {
  conversaciones: ['mi-familia', 'conversaciones'] as const,
  mensajes: (vinculoId: string) => ['mi-familia', 'mensajes', vinculoId] as const,
};

export function useConversacionesFamilia() {
  return useQuery({
    queryKey: KEYS.conversaciones,
    queryFn: listarConversacionesFamilia,
    staleTime: 1000 * 5,
    // Sin Realtime para este módulo: el polling es la forma de enterarse de un mensaje nuevo.
    refetchInterval: 1000 * 15,
    refetchOnMount: 'always',
  });
}

export function useMensajesFamilia(vinculoId: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: KEYS.mensajes(vinculoId),
    queryFn: async () => {
      const mensajes = await listarMensajesFamilia(vinculoId);
      // Abrir la conversación marca los mensajes como leídos: se refresca el contador de la lista.
      void qc.invalidateQueries({ queryKey: KEYS.conversaciones });
      return mensajes;
    },
    enabled: !!vinculoId,
    refetchInterval: 1000 * 10,
  });
}

export function useResponderFamilia(vinculoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contenido: string) => responderFamilia(vinculoId, contenido),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.mensajes(vinculoId) });
      void qc.invalidateQueries({ queryKey: KEYS.conversaciones });
    },
  });
}
