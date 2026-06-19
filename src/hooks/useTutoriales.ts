// Hooks de React Query para el módulo Tutoriales
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
import type { ProgresoTutorial, TutorialConProgreso } from '@/types/database.types';

// Construye un progreso "optimista" completo a partir del actual (o vacío) + un parche.
// Permite que la UI (estrella de favorito, badge completado) reaccione al instante.
function progresoOptimista(
  base: ProgresoTutorial | null | undefined,
  residenteId: string,
  tutorialId: string,
  patch: Partial<ProgresoTutorial>,
): ProgresoTutorial {
  const ahora = new Date().toISOString();
  return {
    id: base?.id ?? `optimistic-${tutorialId}`,
    residente_id: residenteId,
    tutorial_id: tutorialId,
    favorito: base?.favorito ?? false,
    completado: base?.completado ?? false,
    segundos_vistos: base?.segundos_vistos ?? 0,
    ultima_vista: base?.ultima_vista ?? null,
    created_at: base?.created_at ?? ahora,
    updated_at: ahora,
    ...patch,
  };
}

// ─── Keys ─────────────────────────────────────────────────────────────────────
// Exportadas para que el prefetch del Home use exactamente las mismas
export const KEYS = {
  categorias: ['tutoriales', 'categorias'] as const,
  lista: (residenteId: string, catId?: string | null) =>
    ['tutoriales', 'lista', residenteId, catId ?? 'all'] as const,
  detalle: (id: string, residenteId: string | null) =>
    ['tutoriales', 'detalle', id, residenteId ?? ''] as const,
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
    queryFn: () => getTutorialesConProgreso(residenteId ?? null, categoriaId),
    staleTime: 1000 * 60 * 5,
    // Al cambiar de categoría muestra la lista anterior mientras carga la nueva
    placeholderData: keepPreviousData,
  });
}

export function useTutorialDetalle(
  id: string | null | undefined,
  residenteId: string | null,
) {
  return useQuery({
    queryKey: KEYS.detalle(id ?? '', residenteId),
    queryFn: () => getTutorialById(id!, residenteId),
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
  const detalleKey = KEYS.detalle(tutorialId, residenteId);

  const invalidar = () => {
    // Prefijo: invalida todas las variantes de lista (cualquier categoría)
    queryClient.invalidateQueries({ queryKey: ['tutoriales', 'lista'] });
    queryClient.invalidateQueries({ queryKey: KEYS.historial(residenteId) });
    queryClient.invalidateQueries({ queryKey: detalleKey });
  };

  // Actualiza el progreso en la cache del detalle al instante (optimista) y
  // devuelve el valor previo para poder revertir si la mutación falla.
  const aplicarOptimista = async (patch: Partial<ProgresoTutorial>) => {
    await queryClient.cancelQueries({ queryKey: detalleKey });
    const prev = queryClient.getQueryData<TutorialConProgreso>(detalleKey);
    queryClient.setQueryData<TutorialConProgreso>(detalleKey, (old) =>
      old
        ? { ...old, progreso: progresoOptimista(old.progreso, residenteId, tutorialId, patch) }
        : old,
    );
    return { prev };
  };

  const revertir = (ctx: { prev?: TutorialConProgreso } | undefined) => {
    if (ctx?.prev) queryClient.setQueryData(detalleKey, ctx.prev);
  };

  const toggleFavorito = useMutation({
    mutationFn: (favorito: boolean) =>
      upsertProgreso(residenteId, tutorialId, { favorito }),
    onMutate: (favorito: boolean) => aplicarOptimista({ favorito }),
    onError: (_e, _v, ctx) => revertir(ctx),
    onSettled: invalidar,
  });

  const marcarCompletado = useMutation({
    mutationFn: () =>
      upsertProgreso(residenteId, tutorialId, {
        completado: true,
        ultima_vista: new Date().toISOString(),
      }),
    onMutate: () => aplicarOptimista({ completado: true, ultima_vista: new Date().toISOString() }),
    onError: (_e, _v, ctx) => revertir(ctx),
    onSettled: invalidar,
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
