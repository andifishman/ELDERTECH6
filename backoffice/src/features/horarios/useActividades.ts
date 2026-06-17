// ========================================
// HOOK: useActividades + mutaciones
// DESCRIPCIÓN:
// Encapsula las queries y mutaciones de Horarios con
// React Query. Invalida la caché tras cada cambio y se
// integra con Realtime para reflejar todo al instante.
// ========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  actualizarActividad,
  crearActividad,
  eliminarActividad,
  listarActividades,
  obtenerActividad,
  setActivoActividad,
  type ActividadInput,
} from '@/services/actividadesService';
import { obtenerCatalogos } from '@/services/catalogosService';
import { notify } from '@/components/ui/toast';

export function useActividades(fecha?: string) {
  return useQuery({
    queryKey: queryKeys.actividades(fecha),
    queryFn: () => listarActividades(fecha),
  });
}

export function useActividad(id?: string) {
  return useQuery({
    queryKey: ['actividad', id],
    queryFn: () => obtenerActividad(id!),
    enabled: !!id,
  });
}

export function useCatalogos() {
  return useQuery({
    queryKey: queryKeys.catalogos,
    queryFn: obtenerCatalogos,
    staleTime: 1000 * 60 * 10, // catálogos cambian poco
  });
}

// invalida todo lo relacionado a actividades + dashboard
function useInvalidarActividades() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['actividades'] });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useCrearActividad() {
  const invalidar = useInvalidarActividades();
  return useMutation({
    mutationFn: (input: ActividadInput) => crearActividad(input),
    onSuccess: () => {
      notify.success('Actividad creada', 'Ya está visible para los residentes.');
      invalidar();
    },
    onError: () => notify.error('No se pudo crear la actividad'),
  });
}

export function useActualizarActividad() {
  const invalidar = useInvalidarActividades();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ActividadInput }) => actualizarActividad(id, input),
    onSuccess: () => {
      notify.success('Actividad actualizada');
      invalidar();
    },
    onError: () => notify.error('No se pudo guardar los cambios'),
  });
}

export function useToggleActividad() {
  const invalidar = useInvalidarActividades();
  return useMutation({
    mutationFn: ({ id, activo, nombre }: { id: string; activo: boolean; nombre?: string }) =>
      setActivoActividad(id, activo, nombre),
    onSuccess: (_d, v) => {
      notify.success(v.activo ? 'Actividad reactivada' : 'Actividad pausada');
      invalidar();
    },
    onError: () => notify.error('No se pudo cambiar el estado'),
  });
}

export function useEliminarActividad() {
  const invalidar = useInvalidarActividades();
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre?: string }) => eliminarActividad(id, nombre),
    onSuccess: () => {
      notify.success('Actividad eliminada');
      invalidar();
    },
    onError: () => notify.error('No se pudo eliminar la actividad'),
  });
}
