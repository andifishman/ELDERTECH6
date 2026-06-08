// Hooks de React Query para el módulo Tutoriales
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCategoriasTutorial,
  getTutorialesConProgreso,
  getTutorialById,
  getPasosTutorial,
  getTutorialesRelacionados,
  getHistorial,
  upsertProgreso,
  registrarVista,
} from '@/services/tutorialesService';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
  categorias: ['tutoriales', 'categorias'] as const,
  lista: (residenteId: string, catId?: string | null) =>
    ['tutoriales', 'lista', residenteId, catId ?? 'all'] as const,
  detalle: (id: string) => ['tutoriales', 'detalle', id] as const,
  pasos: (id: string) => ['tutoriales', 'pasos', id] as const,
  relacionados: (id: string, catId: string | null) =>
    ['tutoriales', 'relacionados', id, catId ?? ''] as const,
  historial: (residenteId: string) => ['tutoriales', 'historial', residenteId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCategoriasTutorial() {
  return useQuery({
    queryKey: KEYS.categorias,
    queryFn: getCategoriasTutorial,
    staleTime: 1000 * 60 * 30, // 30 min — las categorías no cambian
  });
}

export function useTutoriales(
  residenteId: string | null | undefined,
  categoriaId?: string | null,
) {
  return useQuery({
    queryKey: KEYS.lista(residenteId ?? '', categoriaId),
    queryFn: () => getTutorialesConProgreso(residenteId!, categoriaId),
    enabled: !!residenteId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTutorialDetalle(id: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.detalle(id ?? ''),
    queryFn: () => getTutorialById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

export function usePasosTutorial(tutorialId: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.pasos(tutorialId ?? ''),
    queryFn: () => getPasosTutorial(tutorialId!),
    enabled: !!tutorialId,
    staleTime: 1000 * 60 * 30,
  });
}

export function useTutorialesRelacionados(
  tutorialId: string | null,
  categoriaId: string | null,
) {
  return useQuery({
    queryKey: KEYS.relacionados(tutorialId ?? '', categoriaId),
    queryFn: () => getTutorialesRelacionados(tutorialId!, categoriaId),
    enabled: !!tutorialId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useHistorial(residenteId: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.historial(residenteId ?? ''),
    queryFn: () => getHistorial(residenteId!),
    enabled: !!residenteId,
    staleTime: 0, // siempre fresco
  });
}

// ─── Mutaciones ───────────────────────────────────────────────────────────────

export function useProgresoTutorial(
  residenteId: string,
  tutorialId: string,
  categoriaId: string | null,
) {
  const queryClient = useQueryClient();

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: KEYS.lista(residenteId) });
    queryClient.invalidateQueries({ queryKey: KEYS.historial(residenteId) });
  };

  const toggleFavorito = useMutation({
    mutationFn: (favorito: boolean) =>
      upsertProgreso(residenteId, tutorialId, { favorito }),
    onSuccess: invalidar,
  });

  const marcarCompletado = useMutation({
    mutationFn: () =>
      upsertProgreso(residenteId, tutorialId, {
        completado: true,
        ultima_vista: new Date().toISOString(),
      }),
    onSuccess: invalidar,
  });

  const guardarProgreso = useMutation({
    mutationFn: (segundos: number) =>
      upsertProgreso(residenteId, tutorialId, { segundos_vistos: segundos }),
  });

  const registrar = useMutation({
    mutationFn: () => registrarVista(residenteId, tutorialId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: KEYS.historial(residenteId) }),
  });

  return { toggleFavorito, marcarCompletado, guardarProgreso, registrar };
}
