import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getActividadesPorFecha,
  getActividadesPersonalizadas,
  getActividadById,
} from '@/services/actividadesService';
import { useAuth } from '@/context/AuthContext';
import { toSupabaseDate } from '@/utils/dateUtils';
import { useEffect } from 'react';

// Función helper para armar la queryKey de un día dado (exportada para prefetch)
export function actividadesKey(fecha: Date, residenteId: string | null, interesesKey: string, piso: string | null) {
  return ['actividades', toSupabaseDate(fecha), residenteId, interesesKey, piso];
}

export function useActividades(fecha: Date) {
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const residenteId = profile?.residente?.id ?? null;
  const misInteresesIds = [...(profile?.residente_interes_ids ?? [])].sort();
  const miPiso = profile?.residente?.piso ?? null;
  const interesesKey = misInteresesIds.join(',');

  const fetchFn = (d: Date) =>
    residenteId
      ? getActividadesPersonalizadas(d, misInteresesIds, miPiso)
      : getActividadesPorFecha(d);

  // Key estable del día (Date cambia de identidad en cada render)
  const fechaKey = toSupabaseDate(fecha);

  // Prefetch día anterior y siguiente para que al cambiar sea instantáneo
  useEffect(() => {
    if (authLoading) return;
    const ayer = new Date(fecha);
    ayer.setDate(fecha.getDate() - 1);
    const manana = new Date(fecha);
    manana.setDate(fecha.getDate() + 1);

    queryClient.prefetchQuery({
      queryKey: actividadesKey(ayer, residenteId, interesesKey, miPiso),
      queryFn: () => fetchFn(ayer),
      staleTime: 30 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: actividadesKey(manana, residenteId, interesesKey, miPiso),
      queryFn: () => fetchFn(manana),
      staleTime: 30 * 60 * 1000,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaKey, residenteId, interesesKey, miPiso, authLoading]);

  return useQuery({
    queryKey: actividadesKey(fecha, residenteId, interesesKey, miPiso),
    queryFn: () => fetchFn(fecha),
    enabled: !authLoading,
    staleTime: 30 * 60 * 1000,  // 30 min — los horarios no cambian cada rato
    gcTime: 60 * 60 * 1000,     // 1 hora en caché — días visitados quedan guardados
    retry: 2,
  });
}

export function useActividad(id: string | null) {
  return useQuery({
    queryKey: ['actividad', id],
    queryFn: () => getActividadById(id!),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
