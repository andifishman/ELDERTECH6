import { useQuery } from '@tanstack/react-query';
import {
  getActividadesPorFecha,
  getActividadesPersonalizadas,
  getActividadById,
} from '@/services/actividadesService';
import { useAuth } from '@/context/AuthContext';
import { toSupabaseDate } from '@/utils/dateUtils';

export function useActividades(fecha: Date) {
  const { profile, isLoading: authLoading } = useAuth();

  const residenteId = profile?.residente?.id ?? null;
  // Sort for stable queryKey regardless of order returned from DB
  const misInteresesIds = [...(profile?.residente_interes_ids ?? [])].sort();
  const miPiso = profile?.residente?.piso ?? null;

  return useQuery({
    queryKey: ['actividades', toSupabaseDate(fecha), residenteId, misInteresesIds.join(','), miPiso],
    queryFn: () =>
      residenteId
        ? getActividadesPersonalizadas(fecha, misInteresesIds, miPiso)
        : getActividadesPorFecha(fecha),
    enabled: !authLoading,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useActividad(id: string | null) {
  return useQuery({
    queryKey: ['actividad', id],
    queryFn: () => getActividadById(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}
