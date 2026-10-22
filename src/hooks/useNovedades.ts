// Hooks de React Query para el módulo Novedades
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listarNovedades, marcarNovedadLeida, type Novedad } from '@/services/novedadesService';

const KEY = ['novedades'] as const;

export function useNovedades() {
  return useQuery({
    queryKey: KEY,
    queryFn: listarNovedades,
    staleTime: 1000 * 60,
  });
}

/** Cantidad de novedades que el residente todavía no abrió — para el botón de la Home. */
export function useNovedadesSinLeer(): number {
  const { data } = useNovedades();
  return (data ?? []).filter((n) => !n.leida).length;
}

/** Marca una novedad como leída y actualiza la lista en caché al toque, sin esperar al backend. */
export function useMarcarNovedadLeida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marcarNovedadLeida,
    onMutate: (id: string) => {
      qc.setQueryData<Novedad[]>(KEY, (prev) => prev?.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    },
    onError: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}
