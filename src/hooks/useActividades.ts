//hooks de react-query para cargar actividades desde supabase
import { useQuery } from '@tanstack/react-query';
import { getActividadesPorFecha, getActividadById } from '@/services/actividadesService';
import { toSupabaseDate } from '@/utils/dateUtils';

//carga las actividades de un día específico; se vuelve a buscar si cambia la fecha
export function useActividades(fecha: Date) {
  return useQuery({
    queryKey: ['actividades', toSupabaseDate(fecha)],
    queryFn: () => getActividadesPorFecha(fecha),
    staleTime: 5 * 60 * 1000, // 5 min — los horarios no cambian frecuentemente
    retry: 2,
  });
}

//carga el detalle de una actividad por id; no corre si id es null
export function useActividad(id: string | null) {
  return useQuery({
    queryKey: ['actividad', id],
    queryFn: () => getActividadById(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}
