// Hooks del módulo Asistente — React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFaq,
  getSesionesRecientes,
  getMensajesDeSesion,
  getMensajesFavoritos,
  crearSesion,
  guardarMensaje,
  toggleFavoritoMensaje,
  consultarGemini,
  actualizarTituloSesion,
} from '@/services/asistenteService';
import type { MensajeContexto } from '@/types/asistente.types';

// ─── FAQ ─────────────────────────────────────────────────────────────────────

export function useFaq() {
  return useQuery({
    queryKey: ['faq_asistente'],
    queryFn: getFaq,
    staleTime: 1000 * 60 * 60, // 1h — el FAQ cambia poco
  });
}

// ─── Sesiones ─────────────────────────────────────────────────────────────────

export function useSesionesRecientes(residenteId: string | null) {
  return useQuery({
    queryKey: ['sesiones_asistente', residenteId],
    queryFn: () => getSesionesRecientes(residenteId!),
    enabled: !!residenteId,
  });
}

export function useCrearSesion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (residenteId: string) => crearSesion(residenteId),
    onSuccess: (_, residenteId) => {
      qc.invalidateQueries({ queryKey: ['sesiones_asistente', residenteId] });
    },
  });
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export function useMensajesDeSesion(sesionId: string | null) {
  return useQuery({
    queryKey: ['mensajes_asistente', sesionId],
    queryFn: () => getMensajesDeSesion(sesionId!),
    enabled: !!sesionId,
  });
}

export function useMensajesFavoritos(residenteId: string | null) {
  return useQuery({
    queryKey: ['mensajes_favoritos', residenteId],
    queryFn: () => getMensajesFavoritos(residenteId!),
    enabled: !!residenteId,
  });
}

export function useToggleFavoritoMensaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mensajeId,
      esFavorito,
    }: {
      mensajeId: string;
      esFavorito: boolean;
    }) => toggleFavoritoMensaje(mensajeId, esFavorito),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mensajes_favoritos'] });
    },
  });
}

// ─── Enviar mensaje (flujo completo) ─────────────────────────────────────────

interface EnviarMensajeParams {
  sesionId: string;
  residenteId: string;
  pregunta: string;
  historial: MensajeContexto[];
  esPrimerMensaje: boolean;
}

export function useEnviarMensaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sesionId,
      residenteId,
      pregunta,
      historial,
      esPrimerMensaje,
    }: EnviarMensajeParams) => {
      // 1. Guardar mensaje del usuario
      const msgUsuario = await guardarMensaje(sesionId, residenteId, 'usuario', pregunta);

      // 2. Consultar Gemini
      const respuesta = await consultarGemini(pregunta, historial);

      // 3. Guardar respuesta del asistente
      const msgAsistente = await guardarMensaje(sesionId, residenteId, 'asistente', respuesta);

      // 4. Si es el primer mensaje, generar título de la sesión
      if (esPrimerMensaje) {
        const titulo = pregunta.length > 40 ? pregunta.slice(0, 40) + '...' : pregunta;
        await actualizarTituloSesion(sesionId, titulo);
      }

      return { msgUsuario, msgAsistente };
    },
    onSuccess: (_, { sesionId }) => {
      qc.invalidateQueries({ queryKey: ['mensajes_asistente', sesionId] });
    },
  });
}
