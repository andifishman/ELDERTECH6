// Hook de contactos con React Query — caché, refetch automático y mutaciones
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getContactos,
  agregarContacto,
  eliminarContacto,
  toggleFavorito,
  actualizarContacto,
} from '@/services/contactosService';
import type { ContactoResumen, ContactoUpsert } from '@/types/database.types';

const QUERY_KEY = (residenteId: string) => ['contactos', residenteId];

// ─── Query principal ──────────────────────────────────────────────────────────

export function useContactos(residenteId: string | null | undefined) {
  return useQuery({
    queryKey: QUERY_KEY(residenteId ?? ''),
    queryFn: () => getContactos(residenteId!),
    enabled: !!residenteId,
    staleTime: 1000 * 60 * 5, // 5 minutos — contactos no cambian seguido
    retry: 2,
  });
}

// ─── Mutaciones ───────────────────────────────────────────────────────────────

export function useAgregarContacto(residenteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ContactoUpsert) => agregarContacto(payload),
    onSuccess: (nuevoContacto) => {
      // Actualización optimista: agregar el nuevo contacto al caché
      queryClient.setQueryData<ContactoResumen[]>(
        QUERY_KEY(residenteId),
        (old = []) => {
          // Favoritos primero, luego por orden
          const updated = [...old, nuevoContacto];
          return updated.sort((a, b) => {
            if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
            return a.orden - b.orden || a.nombre.localeCompare(b.nombre);
          });
        },
      );
    },
  });
}

export function useEliminarContacto(residenteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => eliminarContacto(id),
    onMutate: async (id) => {
      // Optimistic update: quitar de la lista inmediatamente
      await queryClient.cancelQueries({ queryKey: QUERY_KEY(residenteId) });
      const snapshot = queryClient.getQueryData<ContactoResumen[]>(QUERY_KEY(residenteId));

      queryClient.setQueryData<ContactoResumen[]>(
        QUERY_KEY(residenteId),
        (old = []) => old.filter((c) => c.id !== id),
      );

      return { snapshot };
    },
    onError: (_err, _id, context) => {
      // Revertir si falla
      if (context?.snapshot) {
        queryClient.setQueryData(QUERY_KEY(residenteId), context.snapshot);
      }
    },
  });
}

export function useToggleFavorito(residenteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, favorito }: { id: string; favorito: boolean }) =>
      toggleFavorito(id, favorito),
    onMutate: async ({ id, favorito }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY(residenteId) });
      const snapshot = queryClient.getQueryData<ContactoResumen[]>(QUERY_KEY(residenteId));

      queryClient.setQueryData<ContactoResumen[]>(
        QUERY_KEY(residenteId),
        (old = []) =>
          old
            .map((c) => (c.id === id ? { ...c, favorito } : c))
            .sort((a, b) => {
              if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
              return a.orden - b.orden || a.nombre.localeCompare(b.nombre);
            }),
      );

      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(QUERY_KEY(residenteId), context.snapshot);
      }
    },
  });
}

export function useActualizarContacto(residenteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ContactoUpsert> }) =>
      actualizarContacto(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(residenteId) });
    },
  });
}
