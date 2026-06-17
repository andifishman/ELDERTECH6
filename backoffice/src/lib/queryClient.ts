// ========================================
// LIB: React Query Client
// DESCRIPCIÓN:
// Instancia única de QueryClient. Define defaults de
// caché conservadores y reintentos. La invalidación se
// dispara desde las mutations y desde las suscripciones
// Realtime para reflejar cambios al instante.
// ========================================
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s — datos frescos sin refetch agresivo
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Claves de caché centralizadas — evita strings sueltos y typos
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  actividades: (fecha?: string) => ['actividades', fecha ?? 'all'] as const,
  catalogos: ['catalogos'] as const,
  tutoriales: ['tutoriales'] as const,
  articulos: ['articulos'] as const,
  residentes: ['residentes'] as const,
  faqs: ['faqs'] as const,
  asistenteStats: ['asistente-stats'] as const,
  auditoria: ['auditoria'] as const,
  organizacion: ['organizacion'] as const,
} as const;
