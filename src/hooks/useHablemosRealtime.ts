// Suscripción a Supabase Realtime para Hablemos — ÚNICA excepción documentada a
// "el cliente nunca habla con Supabase": esto solo recibe eventos de cambio en
// filas que el backend ya autorizó (gateado por las RLS de la migración del
// módulo), nunca lee ni escribe datos de negocio. Toda esa lectura/escritura
// sigue yendo 100% por hablemosService → apiClient → backend.
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { MensajeHablemos } from '@/services/hablemosService';
import { KEYS, actualizarEstadoMensajeEnCache, agregarMensajeALaCache } from './useHablemos';

/** Refresca la lista de conversaciones (orden, preview, no-leídos) cuando cambia cualquiera de las propias. */
export function useConversacionesRealtime(activo: boolean): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!activo) return;

    const canal = supabase
      .channel('hablemos-conversaciones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversaciones' }, () => {
        void qc.invalidateQueries({ queryKey: KEYS.conversaciones });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [activo, qc]);
}

/** Mensajes nuevos y cambios de estado (enviado→recibido→leído) de UNA conversación abierta. */
export function useMensajesRealtime(conversacionId: string, propioResidenteId: string | null): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!conversacionId) return;

    const canal = supabase
      .channel(`hablemos-mensajes-${conversacionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_hablemos', filter: `conversacion_id=eq.${conversacionId}` },
        (payload) => {
          const mensaje = payload.new as MensajeHablemos;
          // El mensaje propio ya se agregó a la cache en el onSuccess del envío — evitar duplicarlo.
          if (mensaje.remitente_id === propioResidenteId) return;
          agregarMensajeALaCache(qc, conversacionId, mensaje);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mensajes_hablemos', filter: `conversacion_id=eq.${conversacionId}` },
        (payload) => {
          actualizarEstadoMensajeEnCache(qc, conversacionId, payload.new as MensajeHablemos);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [conversacionId, propioResidenteId, qc]);
}
