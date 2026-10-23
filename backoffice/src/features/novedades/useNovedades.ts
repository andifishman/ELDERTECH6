import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/components/ui/toast';
import * as service from '@/services/novedadesService';

const KEY_LISTA = ['novedades'] as const;
const KEY_DETALLE = (id: string) => ['novedades', id] as const;

export function useNovedadesLista() {
  return useQuery({ queryKey: KEY_LISTA, queryFn: service.listarNovedades });
}

export function useNovedadDetalle(id?: string) {
  return useQuery({ queryKey: KEY_DETALLE(id ?? ''), queryFn: () => service.obtenerNovedad(id!), enabled: !!id });
}

export function usePublicarNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.publicarNovedad,
    onSuccess: (_data, vars) => {
      const programada = !!vars.publicarEn && new Date(vars.publicarEn).getTime() > Date.now();
      if (vars.borrador) notify.success('Borrador guardado');
      else if (programada) notify.success('Novedad programada', vars.notificar ? 'El aviso se manda a la misma hora.' : undefined);
      else notify.success(vars.notificar ? 'Novedad publicada y aviso enviado' : 'Novedad publicada');
      void qc.invalidateQueries({ queryKey: KEY_LISTA });
    },
    onError: (err: Error) => notify.error('No se pudo guardar la novedad', err.message),
  });
}

export function useEditarNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: service.EditarNovedadInput }) => service.editarNovedad(id, input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: KEY_LISTA });
      void qc.invalidateQueries({ queryKey: KEY_DETALLE(vars.id) });
    },
    onError: (err: Error) => notify.error('No se pudo actualizar la novedad', err.message),
  });
}

export function usePublicarBorrador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; notificar: boolean; publicarEn?: string | null; duracionDias?: number }) => service.publicarBorrador(id, input),
    onSuccess: (_data, vars) => {
      notify.success(vars.notificar ? 'Novedad publicada y aviso enviado' : 'Novedad publicada');
      void qc.invalidateQueries({ queryKey: KEY_LISTA });
    },
    onError: (err: Error) => notify.error('No se pudo publicar la novedad', err.message),
  });
}

export function useReenviarAviso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.reenviarAviso,
    onSuccess: () => {
      notify.success('Aviso enviado de nuevo');
      void qc.invalidateQueries({ queryKey: KEY_LISTA });
    },
    onError: (err: Error) => notify.error('No se pudo reenviar el aviso', err.message),
  });
}

export function useEliminarNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.eliminarNovedad,
    onSuccess: () => {
      notify.success('Novedad eliminada');
      void qc.invalidateQueries({ queryKey: KEY_LISTA });
    },
    onError: (err: Error) => notify.error('No se pudo eliminar la novedad', err.message),
  });
}
