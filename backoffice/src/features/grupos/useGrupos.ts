import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/components/ui/toast';
import * as service from '@/services/gruposService';

const KEY_LISTA = ['grupos'] as const;
const KEY_DETALLE = (id: string) => ['grupos', id] as const;
const KEY_DISPONIBLES = (id: string) => ['grupos', id, 'disponibles'] as const;

export function useGruposLista() {
  return useQuery({ queryKey: KEY_LISTA, queryFn: service.listarGrupos });
}

export function useGrupoDetalle(id?: string) {
  return useQuery({ queryKey: KEY_DETALLE(id ?? ''), queryFn: () => service.obtenerGrupo(id!), enabled: !!id });
}

export function useResidentesDisponibles(grupoId?: string, habilitado = false) {
  return useQuery({
    queryKey: KEY_DISPONIBLES(grupoId ?? ''),
    queryFn: () => service.residentesDisponibles(grupoId!),
    enabled: !!grupoId && habilitado,
  });
}

function useInvalidarLista() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: KEY_LISTA });
}

export function useCrearGrupo() {
  const invalidar = useInvalidarLista();
  return useMutation({
    mutationFn: service.crearGrupo,
    onSuccess: () => {
      notify.success('Grupo creado');
      invalidar();
    },
    onError: (err: Error) => notify.error('No se pudo crear el grupo', err.message),
  });
}

export function useActualizarGrupo() {
  const invalidar = useInvalidarLista();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { nombre?: string; descripcion?: string | null } }) => service.actualizarGrupo(id, input),
    onSuccess: (_data, vars) => {
      notify.success('Grupo actualizado');
      invalidar();
      void qc.invalidateQueries({ queryKey: KEY_DETALLE(vars.id) });
    },
    onError: (err: Error) => notify.error('No se pudo actualizar el grupo', err.message),
  });
}

export function useEliminarGrupo() {
  const invalidar = useInvalidarLista();
  return useMutation({
    mutationFn: service.eliminarGrupo,
    onSuccess: () => {
      notify.success('Grupo eliminado');
      invalidar();
    },
    onError: (err: Error) => notify.error('No se pudo eliminar el grupo', err.message),
  });
}

export function useAgregarMiembros(grupoId: string) {
  const invalidar = useInvalidarLista();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (residenteIds: string[]) => service.agregarMiembros(grupoId, residenteIds),
    onSuccess: () => {
      notify.success('Integrantes agregados');
      invalidar();
      void qc.invalidateQueries({ queryKey: KEY_DETALLE(grupoId) });
      void qc.invalidateQueries({ queryKey: KEY_DISPONIBLES(grupoId) });
    },
    onError: (err: Error) => notify.error('No se pudieron agregar', err.message),
  });
}

export function useQuitarMiembro(grupoId: string) {
  const invalidar = useInvalidarLista();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (residenteId: string) => service.quitarMiembro(grupoId, residenteId),
    onSuccess: () => {
      notify.success('Integrante quitado del grupo');
      invalidar();
      void qc.invalidateQueries({ queryKey: KEY_DETALLE(grupoId) });
      void qc.invalidateQueries({ queryKey: KEY_DISPONIBLES(grupoId) });
    },
    onError: (err: Error) => notify.error('No se pudo quitar', err.message),
  });
}
