// Actualizaciones OTA automáticas (expo-updates) — el residente no hace nada.
//
// Por defecto expo-updates descarga la actualización en segundo plano pero
// recién la aplica la PRÓXIMA vez que se abre la app desde cero; un adulto
// mayor casi nunca cierra la app del todo, así que podía pasar semanas con una
// versión vieja. Acá se busca una actualización al abrir la app y cada vez que
// vuelve de segundo plano, se descarga, y se aplica (reinicio) en un momento
// seguro: justo al abrir (todavía no hay nada en uso) o cuando la app vuelve al
// frente — nunca en medio de una pantalla que el residente está usando.
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';

// No volver a consultar más de una vez cada 10 minutos (evita gastar datos
// si el residente entra y sale de la app seguido).
const INTERVALO_MIN_MS = 10 * 60 * 1000;

export function useActualizacionAutomatica(): void {
  const ultimaConsulta = useRef(0);
  const descargada = useRef(false);

  useEffect(() => {
    // En desarrollo (expo start) y en web no hay OTA.
    if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) return;

    const buscarYDescargar = async () => {
      if (descargada.current) return;
      if (Date.now() - ultimaConsulta.current < INTERVALO_MIN_MS) return;
      ultimaConsulta.current = Date.now();
      try {
        const resultado = await Updates.checkForUpdateAsync();
        if (!resultado.isAvailable) return;
        await Updates.fetchUpdateAsync();
        descargada.current = true;
      } catch {
        // Sin internet o servidor caído: se reintenta la próxima vez, sin molestar al residente.
      }
    };

    // Al abrir: busca, descarga y, si hay algo nuevo, reinicia enseguida
    // (la pantalla de carga todavía está arriba, no se nota).
    void buscarYDescargar().then(() => {
      if (descargada.current) void Updates.reloadAsync().catch(() => {});
    });

    // Al volver de segundo plano: si ya había una descargada, se aplica ahora;
    // si no, se busca una nueva para aplicar la próxima vez que vuelva.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      if (descargada.current) {
        void Updates.reloadAsync().catch(() => {});
        return;
      }
      void buscarYDescargar();
    });
    return () => sub.remove();
  }, []);
}
