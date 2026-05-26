/**
 * RadioContext.tsx
 * ────────────────
 * Contexto global del reproductor de radio.
 *
 * Estrategia de reproducción robusta:
 *  1. Intenta reproducir con urlStream (URL principal)
 *  2. Si falla en los primeros 8 segundos → intenta urlFallback automáticamente
 *  3. Headers Icy-MetaData: 0 para compatibilidad con servidores Icecast/SHOUTcast
 *     (sin este header, responden con "ICY 200 OK" que Android no puede parsear)
 */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import type { RadioStation, RadioPlayerState } from '@/types/radio.types';

// Headers necesarios para compatibilidad con Icecast/SHOUTcast en Android
const STREAM_HEADERS = {
  'Icy-MetaData': '0',
  'User-Agent': 'Mozilla/5.0 (compatible; ElderTech/1.0)',
};

// Tiempo máximo de espera antes de intentar el fallback (ms)
// 5s es suficiente — si un stream directo no responde en 5s, está caído
const FALLBACK_TIMEOUT_MS = 5000;

interface RadioContextValue {
  radioActual: RadioStation | null;
  estado: RadioPlayerState;
  reproducir: (radio: RadioStation) => Promise<void>;
  detener: () => Promise<void>;
  alternar: (radio: RadioStation) => Promise<void>;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const mountedRef = useRef(true);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [radioActual, setRadioActual] = useState<RadioStation | null>(null);
  const [estado, setEstado] = useState<RadioPlayerState>('idle');

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
        { shouldPlay: true, isLooping: false },
        (status) => {
          if (!mountedRef.current) return;
          if (!status.isLoaded) {
            if (status.error) {
              console.warn(`[Radio] Error en status callback: ${status.error}`);
            }
            return;
          }
          if (status.isPlaying) {
            _limpiarTimer(); // Cancelar fallback — está reproduciendo OK
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

  const detener = useCallback(async () => {
    await _limpiarSonido();
    if (mountedRef.current) {
      setEstado('idle');
      setRadioActual(null);
    }
  }, []);

  const reproducir = useCallback(async (radio: RadioStation) => {
    // Detener reproducción anterior
    await _limpiarSonido();

    if (!mountedRef.current) return;
    setEstado('loading');
    setRadioActual(radio);

    // ── Intento 1: URL principal ──────────────────────────────────────────
    const exito = await _intentarReproducir(radio.urlStream, () => {
      if (mountedRef.current) setEstado('playing');
    });

    if (!exito) {
      // URL principal falló inmediatamente → intentar fallback si existe
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

    // ── Fallback por timeout ──────────────────────────────────────────────
    // Si después de FALLBACK_TIMEOUT_MS el estado sigue en 'loading',
    // significa que el stream no respondió → intentar fallback
    if (radio.urlFallback) {
      fallbackTimerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        // Solo actuar si todavía estamos en loading (no llegó a playing)
        setEstado((prev) => {
          if (prev !== 'loading') return prev; // Ya está reproduciendo, no hacer nada
          return prev;
        });

        // Verificar estado actual
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
  }, []);

  const alternar = useCallback(async (radio: RadioStation) => {
    if (radioActual?.id === radio.id && estado === 'playing') {
      await detener();
    } else {
      await reproducir(radio);
    }
  }, [radioActual, estado, reproducir, detener]);

  return (
    <RadioContext.Provider value={{ radioActual, estado, reproducir, detener, alternar }}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadioPlayer(): RadioContextValue {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error('useRadioPlayer debe usarse dentro de RadioProvider');
  return ctx;
}
