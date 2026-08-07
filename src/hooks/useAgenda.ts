// Hooks de React Query para el módulo Agenda
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  agendaDeHoy,
  agendaDeLaSemana,
  agendaDelMes,
  cambiarEstadoRecordatorio,
  crearRecordatorio,
  editarRecordatorio,
  eliminarRecordatorio,
  listarRecordatorios,
  obtenerRecordatorio,
  proximosRecordatorios,
  type EstadoRecordatorio,
  type ListarRecordatoriosOpciones,
  type RecordatorioInput,
} from '@/services/agendaService';

export const KEYS = {
  todos: ['agenda'] as const,
  listar: (opciones: ListarRecordatoriosOpciones) => ['agenda', 'listar', opciones] as const,
  hoy: ['agenda', 'hoy'] as const,
  semana: (fecha?: string) => ['agenda', 'semana', fecha ?? 'actual'] as const,
  mes: (fecha?: string) => ['agenda', 'mes', fecha ?? 'actual'] as const,
  proximos: (limit: number) => ['agenda', 'proximos', limit] as const,
  detalle: (id: string) => ['agenda', 'detalle', id] as const,
};

function invalidarTodo(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: KEYS.todos });
}

export function useAgendaListar(opciones: ListarRecordatoriosOpciones) {
  return useQuery({
    queryKey: KEYS.listar(opciones),
    queryFn: () => listarRecordatorios(opciones),
    staleTime: 1000 * 15,
  });
}

export function useAgendaHoy() {
  return useQuery({
    queryKey: KEYS.hoy,
    queryFn: agendaDeHoy,
    staleTime: 1000 * 15,
  });
}

export function useAgendaSemana(fecha?: string) {
  return useQuery({
    queryKey: KEYS.semana(fecha),
    queryFn: () => agendaDeLaSemana(fecha),
    staleTime: 1000 * 15,
  });
}

export function useAgendaMes(fecha?: string) {
  return useQuery({
    queryKey: KEYS.mes(fecha),
    queryFn: () => agendaDelMes(fecha),
    staleTime: 1000 * 15,
  });
}

export function useAgendaProximos(limit = 10) {
  return useQuery({
    queryKey: KEYS.proximos(limit),
    queryFn: () => proximosRecordatorios(limit),
    staleTime: 1000 * 15,
  });
}

export function useAgendaDetalle(id: string | null) {
  return useQuery({
    queryKey: KEYS.detalle(id ?? ''),
    queryFn: () => obtenerRecordatorio(id!),
    enabled: !!id,
    staleTime: 1000 * 15,
  });
}

export function useCrearRecordatorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordatorioInput) => crearRecordatorio(input),
    onSuccess: () => invalidarTodo(qc),
  });
}

export function useEditarRecordatorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RecordatorioInput> }) => editarRecordatorio(id, input),
    onSuccess: () => invalidarTodo(qc),
  });
}

export function useEliminarRecordatorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarRecordatorio(id),
    onSuccess: () => invalidarTodo(qc),
  });
}

export function useCambiarEstadoRecordatorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoRecordatorio & ('pendiente' | 'realizado' | 'cancelado') }) =>
      cambiarEstadoRecordatorio(id, estado),
    onSuccess: () => invalidarTodo(qc),
  });
}

