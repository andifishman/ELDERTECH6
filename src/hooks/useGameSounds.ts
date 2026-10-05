// Efectos de sonido cortos y suaves para los juegos de puntaje (Jardín
// ElderTech, Bloques ElderTech). Respeta la preferencia global de sonido
// (SonidoJuegosContext) — si está apagado, no carga ni reproduce nada.
import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useSonidoJuegos } from '@/context/SonidoJuegosContext';

const ARCHIVOS = {
  colocar: require('../../assets/sounds/colocar.wav'),
  combinacion: require('../../assets/sounds/combinacion.wav'),
  linea_completa: require('../../assets/sounds/linea_completa.wav'),
  puntaje_alto: require('../../assets/sounds/puntaje_alto.wav'),
} as const;

export type EfectoSonido = keyof typeof ARCHIVOS;

export function useGameSounds() {
  const { sonidoActivado } = useSonidoJuegos();
  const sonidosRef = useRef<Partial<Record<EfectoSonido, Audio.Sound>>>({});
  const cargadosRef = useRef(false);

  useEffect(() => {
    if (!sonidoActivado || cargadosRef.current) return;
    cargadosRef.current = true;

    let cancelado = false;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
        const entradas = await Promise.all(
          (Object.keys(ARCHIVOS) as EfectoSonido[]).map(async (clave) => {
            const { sound } = await Audio.Sound.createAsync(ARCHIVOS[clave]);
            return [clave, sound] as const;
          }),
        );
        if (cancelado) {
          await Promise.all(entradas.map(([, sound]) => sound.unloadAsync().catch(() => {})));
          return;
        }
        for (const [clave, sound] of entradas) sonidosRef.current[clave] = sound;
      } catch (err) {
        console.warn('[useGameSounds] no se pudieron cargar los sonidos', err);
      }
    })();

    return () => {
      cancelado = true;
      Object.values(sonidosRef.current).forEach((sound) => sound?.unloadAsync().catch(() => {}));
      sonidosRef.current = {};
      cargadosRef.current = false;
    };
  }, [sonidoActivado]);

  const reproducir = useCallback(
    (efecto: EfectoSonido) => {
      if (!sonidoActivado) return;
      const sound = sonidosRef.current[efecto];
      if (!sound) return;
      sound.replayAsync().catch(() => {});
    },
    [sonidoActivado],
  );

  return { reproducir };
}
