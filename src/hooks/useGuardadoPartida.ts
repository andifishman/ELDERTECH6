import { useCallback, useRef, useState } from 'react';

/**
 * Estado compartido del "guardar el resultado de una partida": mientras se
 * guarda, si falló y cómo reintentar. Los juegos con puntaje (Bloques, Jardín)
 * lo usan para no perder el puntaje en silencio cuando falla la red o la sesión.
 *
 * `intento` devuelve `true` si todo se guardó. Se recuerda el último intento
 * para que `reintentar` repita exactamente lo mismo, sin que el juego tenga
 * que guardar de nuevo el puntaje final por su cuenta.
 */
export function useGuardadoPartida() {
  const [errorGuardado, setErrorGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const ultimoIntento = useRef<(() => Promise<boolean>) | null>(null);

  const guardar = useCallback(async (intento: () => Promise<boolean>): Promise<void> => {
    ultimoIntento.current = intento;
    setGuardando(true);
    const seGuardo = await intento().catch(() => false);
    setGuardando(false);
    setErrorGuardado(!seGuardo);
  }, []);

  const reintentar = useCallback(() => {
    if (ultimoIntento.current) void guardar(ultimoIntento.current);
  }, [guardar]);

  /** Al empezar una partida nueva: el aviso de la anterior ya no corresponde. */
  const reiniciar = useCallback(() => {
    ultimoIntento.current = null;
    setErrorGuardado(false);
    setGuardando(false);
  }, []);

  return { errorGuardado, guardando, guardar, reintentar, reiniciar };
}
