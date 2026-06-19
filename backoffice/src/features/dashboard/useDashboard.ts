// ========================================
// HOOK: useDashboard
// DESCRIPCIÓN:
// Carga en paralelo los KPIs y datasets del dashboard.
// ========================================
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  obtenerActividadReciente,
  obtenerActividadesHoy,
  obtenerActividadesPorCategoria,
  obtenerKpis,
  obtenerResidentesRecientes,
  obtenerTutorialesMasVistos,
} from '@/services/dashboardService';

const REFETCH_INTERVAL = 30_000;

export function useDashboardKpis() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'kpis'], queryFn: obtenerKpis, refetchInterval: REFETCH_INTERVAL });
}

export function useActividadesHoy() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'actividades-hoy'], queryFn: obtenerActividadesHoy, refetchInterval: REFETCH_INTERVAL });
}

export function useResidentesRecientes() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'residentes-recientes'], queryFn: () => obtenerResidentesRecientes(5), refetchInterval: REFETCH_INTERVAL });
}

export function useTutorialesMasVistos() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'tutoriales-vistos'], queryFn: () => obtenerTutorialesMasVistos(6), refetchInterval: REFETCH_INTERVAL });
}

export function useActividadesPorCategoria() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'act-categoria'], queryFn: obtenerActividadesPorCategoria, refetchInterval: REFETCH_INTERVAL });
}

export function useActividadReciente() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'actividad-reciente'], queryFn: () => obtenerActividadReciente(6), refetchInterval: REFETCH_INTERVAL });
}
