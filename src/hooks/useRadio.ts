import { useQuery } from '@tanstack/react-query';
import { getRadioData, RADIO_DATA_FALLBACK } from '@/services/radioService';
import { ORG_ID } from '@/services/supabase';

export function useRadioData() {
  return useQuery({
    queryKey: ['radio-data'],
    queryFn: async () => {
      try {
        if (!ORG_ID) return RADIO_DATA_FALLBACK;
        const data = await getRadioData();
        return data.radios.length ? data : RADIO_DATA_FALLBACK;
      } catch {
        return RADIO_DATA_FALLBACK;
      }
    },
    staleTime: 60 * 60 * 1000, // 1h — las radios cambian poco
    retry: 1,
  });
}
