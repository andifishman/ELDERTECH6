import { useQuery } from '@tanstack/react-query';
import { getHorariosHogar } from '@/services/horariosHogarService';

const CINCO_MINUTOS = 5 * 60 * 1000;

//la semana completa en una sola request; el backend ya la tiene en caché, así que refrescar es barato
export function useHorariosHogar() {
  return useQuery({
    queryKey: ['horarios-hogar'],
    queryFn: getHorariosHogar,
    staleTime: CINCO_MINUTOS,
    refetchInterval: CINCO_MINUTOS,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });
}
