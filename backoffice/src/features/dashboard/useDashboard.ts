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

export function useDashboardKpis() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'kpis'], queryFn: obtenerKpis });
}

export function useActividadesHoy() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'actividades-hoy'], queryFn: obtenerActividadesHoy });
}

export function useResidentesRecientes() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'residentes-recientes'], queryFn: () => obtenerResidentesRecientes(5) });
}

export function useTutorialesMasVistos() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'tutoriales-vistos'], queryFn: () => obtenerTutorialesMasVistos(6) });
}

export function useActividadesPorCategoria() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'act-categoria'], queryFn: obtenerActividadesPorCategoria });
}

export function useActividadReciente() {
  return useQuery({ queryKey: [...queryKeys.dashboard, 'actividad-reciente'], queryFn: () => obtenerActividadReciente(6) });
}
