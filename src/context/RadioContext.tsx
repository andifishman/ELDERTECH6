//contexto global del reproductor de radio con manejo de fallback automático

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import type { RadioStation, RadioPlayerState } from '@/types/radio.types';

// Headers necesarios para compatibilidad con Icecast/SHOUTcast en Android
const STREAM_HEADERS = {
  'Icy-MetaData': '0',
  'User-Agent': 'Mozilla/5.0 (compatible; ElderTech/1.0)',
};

// Tiempo máximo de espera antes de intentar el fallback (ms)
const FALLBACK_TIMEOUT_MS = 5000;

// Paso de volumen al presionar + / −  (10%)
const VOLUMEN_PASO = 0.1;

interface RadioContextValue {
  radioActual: RadioStation | null;
  estado: RadioPlayerState;
  volumen: number;                          // 0.0 – 1.0
  subirVolumen: () => void;
  bajarVolumen: () => void;
  reproducir: (radio: RadioStation) => Promise<void>;
  detener: () => Promise<void>;
  alternar: (radio: RadioStation) => Promise<void>;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const mountedRef = useRef(true);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  //radio que se está reproduciendo actualmente
  const [radioActual, setRadioActual] = useState<RadioStation | null>(null);
  //estado de la reproducción: idle | loading | playing | paused | error
  const [estado, setEstado] = useState<RadioPlayerState>('idle');
  //nivel de volumen entre 0 y 1
  const [volumen, setVolumen] = useState<number>(1.0); // arranca al máximo

  //limpia el sonido y los timers cuando el provider se desmonta
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      _limpiarTimer();
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => null);
        soundRef.current.unloadAsync().catch(() => null);
        soundRef.current = null;
      }
    };
  }, []);

  function _limpiarTimer() {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  async function _limpiarSonido() {
    _limpiarTimer();
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => null);
      await soundRef.current.unloadAsync().catch(() => null);
      soundRef.current = null;
    }
  }

  /**
   * Aplica el volumen actual al Sound activo.
   */
  async function _aplicarVolumen(v: number) {
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(v).catch(() => null);
    }
  }

  /**
   * Intenta cargar y reproducir una URL de stream.
   * Devuelve true si tuvo éxito, false si falló.
   */
  async function _intentarReproducir(
    url: string,
    onPlayingCallback: () => void,
  ): Promise<boolean> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: url, headers: STREAM_HEADERS },
        { shouldPlay: true, isLooping: false, volume: volumen },
        (status) => {
          if (!mountedRef.current) return;
          if (!status.isLoaded) {
            if (status.error) {
              console.warn(`[Radio] Error en status callback: ${status.error}`);
            }
            return;
          }
          if (status.isPlaying) {
            _limpiarTimer();
            onPlayingCallback();
          }
          if (status.didJustFinish) {
            if (mountedRef.current) setEstado('idle');
          }
        },
      );

      soundRef.current = sound;
      return true;
    } catch (err) {
      console.warn(`[Radio] Error al cargar stream ${url}:`, err);
      return false;
    }
  }

  // ── Controles de volumen ───────────────────────────────────────────────────

  //sube el volumen un 10%; no supera 1.0
  const subirVolumen = useCallback(() => {
    setVolumen((prev) => {
      const nuevo = Math.min(1, parseFloat((prev + VOLUMEN_PASO).toFixed(1)));
      _aplicarVolumen(nuevo);
      return nuevo;
    });
  }, []);

  //baja el volumen un 10%; no baja de 0
  const bajarVolumen = useCallback(() => {
    setVolumen((prev) => {
      const nuevo = Math.max(0, parseFloat((prev - VOLUMEN_PASO).toFixed(1)));
      _aplicarVolumen(nuevo);
      return nuevo;
    });
  }, []);

  // ── Reproductor ────────────────────────────────────────────────────────────

  //detiene la reproducción y limpia el estado
  const detener = useCallback(async () => {
    await _limpiarSonido();
    if (mountedRef.current) {
      setEstado('idle');
      setRadioActual(null);
    }
  }, []);

  //inicia la reproducción de una radio; intenta el fallback si la url principal falla
  const reproducir = useCallback(async (radio: RadioStation) => {
    await _limpiarSonido();

    if (!mountedRef.current) return;
    setEstado('loading');
    setRadioActual(radio);

    const exito = await _intentarReproducir(radio.urlStream, () => {
      if (mountedRef.current) setEstado('playing');
    });

    if (!exito) {
      if (radio.urlFallback) {
        console.log(`[Radio] URL principal falló, intentando fallback: ${radio.urlFallback}`);
        const exitoFallback = await _intentarReproducir(radio.urlFallback, () => {
          if (mountedRef.current) setEstado('playing');
        });
        if (!exitoFallback) {
          if (mountedRef.current) {
            setEstado('error');
            setRadioActual(null);
          }
        }
      } else {
        if (mountedRef.current) {
          setEstado('error');
          setRadioActual(null);
        }
      }
      return;
    }

    if (radio.urlFallback) {
      fallbackTimerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;

        const statusActual = await soundRef.current?.getStatusAsync().catch(() => null);
        const estaReproduciendo = statusActual?.isLoaded && (statusActual as any).isPlaying;

        if (!estaReproduciendo && mountedRef.current) {
          console.log(`[Radio] Timeout — intentando fallback: ${radio.urlFallback}`);
          await _limpiarSonido();
          if (!mountedRef.current) return;

          const exitoFallback = await _intentarReproducir(radio.urlFallback!, () => {
            if (mountedRef.current) setEstado('playing');
          });

          if (!exitoFallback && mountedRef.current) {
            setEstado('error');
            setRadioActual(null);
          }
        }
      }, FALLBACK_TIMEOUT_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumen]);

  //si la radio ya está sonando la detiene; si no, la reproduce
  const alternar = useCallback(async (radio: RadioStation) => {
    if (radioActual?.id === radio.id && estado === 'playing') {
      await detener();
    } else {
      await reproducir(radio);
    }
  }, [radioActual, estado, reproducir, detener]);

  return (
    <RadioContext.Provider
      value={{ radioActual, estado, volumen, subirVolumen, bajarVolumen, reproducir, detener, alternar }}
    >
      {children}
    </RadioContext.Provider>
  );
}

export function useRadioPlayer(): RadioContextValue {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error('useRadioPlayer debe usarse dentro de RadioProvider');
  return ctx;
}
